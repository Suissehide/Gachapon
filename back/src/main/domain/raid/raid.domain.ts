import Boom from '@hapi/boom'

import { errorMessage } from '../../infra/i18n/error-messages'
import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { TeamRepository } from '../../infra/orm/repositories/team.repository'
import type { TeamMemberRepository } from '../../infra/orm/repositories/team-member.repository'
import type { RaidAttackEvent, WsManager } from '../../interfaces/ws/ws-manager'
import type { Config } from '../../types/application/config'
import type { IocContainer } from '../../types/application/ioc'
import type {
  IRaidDomain,
  RaidAttackResult,
  RaidContribution,
  RaidHistoryEntry,
  RaidMemberStatsView,
  RaidTeamBadge,
  RaidTierView,
  RaidView,
} from '../../types/domain/raid/raid.domain.interface'
import type { TeamWithMembers } from '../../types/domain/team/team.types'
import type { ITeamProgressionDomain } from '../../types/domain/team-progression/team-progression.domain.interface'
import type { ConfigServiceInterface } from '../../types/infra/config/config.service.interface'
import type {
  IRaidRepository,
  RaidTierWithReward,
  TeamRaidWithBoss,
} from '../../types/infra/orm/repositories/raid.repository.interface'
import type { StorageClientInterface } from '../../types/infra/storage/storage-client'
import type { Logger } from '../../types/utils/logger'
import { unitPower } from '../campaign/campaign-power'
import { resolveEnemyImageUrl } from '../campaign/enemy-appearance'
import { simulateBattle } from '../combat/battle-simulator.domain'
import type { CombatStatsBaseline } from '../combat/combat-stats.domain'
import type { CombatTeamTx } from '../combat/combat-team.tx'
import { RAID_TEAM_KEY } from '../combat/combat-team-keys'
import {
  buildEnemySimUnits,
  buildPlayerSimUnits,
  enemySpecSchema,
} from '../combat/sim-units'
import {
  SET_BONUS_CONFIG_KEYS,
  setBonusesFromConfig,
} from '../equipment/set-bonuses'
import { retryOnSerialization } from '../shared/retry-serialization'
import type { TowerElement } from '../tower/tower-slots'
import {
  attacksRemaining,
  crossedTiers,
  damageDealtToBoss,
  nextRaidLevel,
  RAID_BOSS_SIM_HP,
  raidElementForWeek,
  raidMaxHp,
  raidPct,
  raidWeekEndsAt,
  raidWeekKey,
  utcDayStart,
} from './raid-rules'

function tierView(tier: RaidTierWithReward, reached: boolean): RaidTierView {
  return {
    pct: tier.pct,
    reached,
    reward: {
      tokens: tier.reward.tokens,
      dust: tier.reward.dust,
      gold: tier.reward.gold,
      xp: tier.reward.xp,
      cardRarity: tier.reward.cardRarity,
    },
  }
}

export class RaidDomain implements IRaidDomain {
  readonly #configService: ConfigServiceInterface
  readonly #config: Config
  readonly #storageClient: StorageClientInterface
  readonly #teamRepository: TeamRepository
  readonly #teamMemberRepository: TeamMemberRepository
  readonly #raidRepository: IRaidRepository
  readonly #postgresOrm: PostgresOrm
  readonly #wsManager: WsManager
  readonly #logger: Logger
  readonly #teamProgressionDomain: ITeamProgressionDomain
  readonly #combatTeamTx: CombatTeamTx

  constructor({
    configService,
    config,
    storageClient,
    teamRepository,
    teamMemberRepository,
    raidRepository,
    postgresOrm,
    wsManager,
    logger,
    teamProgressionDomain,
    combatTeamTx,
  }: IocContainer) {
    this.#configService = configService
    this.#config = config
    this.#storageClient = storageClient
    this.#teamRepository = teamRepository
    this.#teamMemberRepository = teamMemberRepository
    this.#raidRepository = raidRepository
    this.#postgresOrm = postgresOrm
    this.#teamProgressionDomain = teamProgressionDomain
    this.#wsManager = wsManager
    this.#logger = logger
    this.#combatTeamTx = combatTeamTx
  }

  async getRaid(
    teamId: string,
    userId: string,
    now: Date = new Date(),
  ): Promise<RaidView> {
    const team = await this.#requireMembership(teamId, userId)
    const raid = await this.#ensureRaid(team, now)
    return this.#buildView(raid, team, userId, now)
  }

  async getContributions(
    teamId: string,
    userId: string,
  ): Promise<RaidContribution[]> {
    const team = await this.#requireMembership(teamId, userId)
    const raid = await this.#ensureRaid(team, new Date())
    return this.#contributions(raid.id, team)
  }

  /**
   * Une attaque = une bataille à tours limités contre le boss (PV simulés
   * infinis). Les dégâts infligés sont retirés de la barre commune, dans
   * une transaction Serializable (deux coéquipiers peuvent attaquer en
   * même temps). Les lots des paliers atteints sont donnés à TOUS les
   * participants en une insertion idempotente (unicité
   * [userId, source, sourceId]), ce qui couvre aussi le rattrapage d'un
   * membre arrivé après un palier.
   */
  async attack(
    teamId: string,
    userId: string,
    now: Date = new Date(),
  ): Promise<RaidAttackResult> {
    const team = await this.#requireMembership(teamId, userId)
    // `ensured` et pas `raid` : la transaction ci-dessous déclare déjà un
    // `raid`, la ligne rechargée sous verrou. Deux noms distincts pour deux
    // lectures distinctes.
    const ensured = await this.#ensureRaid(team, now)
    const raidId = ensured.id
    // AVANT la transaction : une création de `Reward` dedans lèverait un
    // P2002 non rattrapé par `retryOnSerialization` (qui ne voit que P2034).
    await this.#tiersFor(ensured.level)

    // Config lue AVANT la transaction (pas d'I/O async étranger dans un tx
    // Serializable) — même motif que tower.domain#fight.
    //
    // `raidAttacksBonusForTeam(teamId)`, PAS `effectsForUser(userId)` : ce
    // quota mord sur les PV du boss de CETTE équipe, calibrés par membre.
    // Le scoper au joueur laisserait un rang acheté dans une équipe A
    // apporter des attaques en plus sur le boss d'une équipe B qui n'a
    // jamais investi un point. Même raison pour `used`, compté sur le raid
    // et non sur le joueur : les PV supposent que chaque membre dispose de
    // ses attaques, et les lots de palier se gagnent déjà DANS une équipe
    // (clé `raid.id` plus bas). Un joueur de trois équipes a donc trois
    // quotas, bornés par MAX_TEAMS_PER_USER.
    const [cfg, raidBonus] = await Promise.all([
      this.#configService.getMany(
        'combat.elementAdvantageMult',
        'combat.elementDisadvantageMult',
        'combat.defMitigationRef',
        'combat.baseCritRate',
        'combat.baseCritDmg',
        'combat.baseArmorPen',
        'combat.baseLifesteal',
        'raid.attacksPerDay',
        'raid.timeoutTurns',
        ...SET_BONUS_CONFIG_KEYS,
      ),
      this.#teamProgressionDomain.raidAttacksBonusForTeam(teamId),
    ])
    const setDefs = setBonusesFromConfig(cfg)
    const baseStats: CombatStatsBaseline = {
      critRate: cfg['combat.baseCritRate'],
      critDmg: cfg['combat.baseCritDmg'],
      armorPen: cfg['combat.baseArmorPen'],
      lifesteal: cfg['combat.baseLifesteal'],
    }
    const perDay = cfg['raid.attacksPerDay'] + raidBonus

    const outcome = await retryOnSerialization(() =>
      this.#postgresOrm.executeWithTransactionClient(
        // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: motif calqué sur tower.domain#fight
        async (tx): Promise<RaidAttackResult> => {
          const raid = await tx.teamRaid.findUnique({
            where: { id: raidId },
            include: { boss: true },
          })
          if (!raid) {
            throw Boom.notFound(errorMessage('raid.notFound'))
          }
          if (raid.killedAt || raid.hp <= 0) {
            throw Boom.conflict(errorMessage('raid.bossAlreadyDefeated'))
          }

          const used = await tx.raidAttack.count({
            where: {
              raidId: raid.id,
              userId,
              createdAt: { gte: utcDayStart(now) },
            },
          })
          if (used >= perDay) {
            throw Boom.tooManyRequests(errorMessage('raid.noAttacksLeftToday'))
          }

          const { userCardIds } = await this.#combatTeamTx.resolveIdsInTx(
            tx,
            userId,
            RAID_TEAM_KEY,
          )
          if (userCardIds.length === 0) {
            throw Boom.badRequest(errorMessage('combat.noTeamComposed'))
          }
          const teamUnits = await buildPlayerSimUnits(tx, {
            userId,
            userCardIds,
            defMitigationRef: cfg['combat.defMitigationRef'],
            baseStats,
            setDefs,
            publicUrl: (key) => this.#storageClient.publicUrl(key),
          })
          if (teamUnits.length === 0) {
            throw Boom.badRequest(errorMessage('combat.cardsNotOwnedByPlayer'))
          }

          const spec = enemySpecSchema.parse(raid.boss.spec)
          const [bossUnit] = buildEnemySimUnits([spec], {
            defMitigationRef: cfg['combat.defMitigationRef'],
            baseStats,
            resolveImage: (appearance) =>
              resolveEnemyImageUrl(
                appearance,
                (key) => this.#storageClient.publicUrl(key),
                this.#config.isDevelopment ? 'staging/' : '',
              ),
          })
          if (!bossUnit) {
            throw Boom.badImplementation(errorMessage('raid.invalidBossSpec'))
          }
          bossUnit.hp = RAID_BOSS_SIM_HP
          bossUnit.name = raid.boss.name

          const seed = `${userId}:raid:${raid.id}:${now.getTime()}`
          const sim = simulateBattle({
            teamA: teamUnits,
            teamB: [bossUnit],
            seed,
            timeoutTurns: cfg['raid.timeoutTurns'],
            elementAdvantageMult: cfg['combat.elementAdvantageMult'],
            elementDisadvantageMult: cfg['combat.elementDisadvantageMult'],
          })

          const hpBefore = raid.hp
          // On ne comptabilise jamais l'overkill (non-objectif de la spec) :
          // les dégâts enregistrés sont plafonnés aux PV restants avant le
          // coup, pour que hpAfter === hpBefore - damage reste toujours vrai
          // et que la somme des contributions ne dépasse jamais la barre.
          const damage = Math.min(damageDealtToBoss(sim.log), hpBefore)
          const hpAfter = hpBefore - damage
          const killed = hpAfter === 0

          await tx.teamRaid.update({
            where: { id: raid.id },
            data: { hp: hpAfter, ...(killed ? { killedAt: now } : {}) },
          })
          // Toujours enregistrée, même à 0 dégât : consomme le quota du
          // jour et rend le joueur participant, donc éligible aux paliers.
          await tx.raidAttack.create({
            data: { raidId: raid.id, userId, damage, seed, userCardIds },
          })

          const tiers = await tx.raidTier.findMany({
            where: { level: raid.level },
            include: { reward: true },
            orderBy: { pct: 'asc' },
          })
          const before = crossedTiers(raid.maxHp - hpBefore, raid.maxHp, tiers)
          const after = crossedTiers(raid.maxHp - hpAfter, raid.maxHp, tiers)
          if (after.length > 0) {
            const participants = await tx.raidAttack.findMany({
              where: { raidId: raid.id },
              distinct: ['userId'],
              select: { userId: true },
            })
            // Clé sur le RAID (raid.id), qui est unique par équipe ET par
            // semaine : les lots de palier se gagnent DANS une équipe, donc un
            // joueur qui joue le raid de plusieurs équipes les gagne dans
            // chacune. Le plafond d'équipes par joueur (MAX_TEAMS_PER_USER,
            // team.domain.ts) borne volontairement ce cumul — c'est lui le
            // levier, pas la clé. Avec la contrainte unique
            // [userId, source, sourceId], un palier donné d'un raid donné
            // n'est jamais versé deux fois, et un joueur arrivé après coup
            // reçoit d'un coup tous les paliers déjà franchis.
            await tx.userReward.createMany({
              data: participants.flatMap((p) =>
                after.map((t) => ({
                  userId: p.userId,
                  rewardId: t.rewardId,
                  source: 'RAID' as const,
                  sourceId: `${raid.id}:${t.pct}`,
                })),
              ),
              skipDuplicates: true,
            })
          }
          const beforePcts = new Set(before.map((t) => t.pct))
          const newTiers = after
            .filter((t) => !beforePcts.has(t.pct))
            .map((t) => tierView(t, true))

          return {
            log: sim.log,
            teamA: teamUnits,
            teamB: [bossUnit],
            damage,
            hpBefore,
            hpAfter,
            maxHp: raid.maxHp,
            killed,
            newTiers,
            attacksRemainingToday: attacksRemaining(used + 1, perDay),
          }
        },
        { isolationLevel: 'Serializable' },
      ),
    )

    // Après commit : la barre bouge en direct chez les coéquipiers connectés.
    const attacker = team.members.find((m) => m.userId === userId)?.user
    const event: RaidAttackEvent = {
      type: 'raid:attack',
      teamId,
      raidId,
      hp: outcome.hpAfter,
      maxHp: outcome.maxHp,
      attacker: {
        id: userId,
        username:
          attacker?.username ?? errorMessage('wagers.unknownPlayerFallback'),
      },
      damage: outcome.damage,
      killed: outcome.killed,
    }
    for (const member of team.members) {
      this.#wsManager.notify(member.userId, event)
    }

    return outcome
  }

  /**
   * Le raid EN COURS de plusieurs équipes, réduit à ce qu'une liste
   * affiche. Aucune création paresseuse ici, contrairement à `getRaid` :
   * afficher la liste de ses équipes ne doit pas ouvrir trois raids et
   * figer leurs PV sur l'effectif du moment. Une équipe sans raid cette
   * semaine est simplement absente de la Map.
   */
  async currentRaidBadges(
    teamIds: string[],
    now: Date = new Date(),
  ): Promise<Map<string, RaidTeamBadge>> {
    const raids = await this.#raidRepository.listRaidsForTeams(
      teamIds,
      raidWeekKey(now),
    )
    return new Map(
      raids.map((raid) => [
        raid.teamId,
        {
          bossName: raid.boss.name,
          pct: raidPct(raid.maxHp - raid.hp, raid.maxHp),
        },
      ]),
    )
  }

  /** Les `limit` dernières semaines révolues, plus récentes d'abord. */
  async getHistory(
    teamId: string,
    limit: number,
    now: Date = new Date(),
  ): Promise<RaidHistoryEntry[]> {
    const raids = await this.#raidRepository.listPastRaids(
      teamId,
      raidWeekKey(now),
      limit,
    )
    return raids.map((raid) => ({
      weekKey: raid.weekKey,
      endsAt: raidWeekEndsAt(raid.weekKey).toISOString(),
      bossName: raid.boss.name,
      bossElement: raid.boss.element as TowerElement,
      maxHp: raid.maxHp,
      level: raid.level,
      damage: raid.maxHp - raid.hp,
      pct: raidPct(raid.maxHp - raid.hp, raid.maxHp),
      killedAt: raid.killedAt ? raid.killedAt.toISOString() : null,
    }))
  }

  /** Nombre de raids de l'équipe achevés par un kill. */
  countRaidsWon(teamId: string): Promise<number> {
    return this.#raidRepository.countKills(teamId)
  }

  /**
   * Dégâts et attaques restantes de CHAQUE membre sur le raid en cours.
   *
   * Repose sur `#contributions`, l'agrégation que la vue de raid utilise
   * déjà : deux agrégations des mêmes lignes divergeraient au premier
   * changement de règle. Elle ne renvoie que les membres qui ont attaqué —
   * l'appelant complète à 0 ceux qui manquent, il a la liste des membres.
   *
   * Le quota est compté SUR LE RAID de cette équipe, exactement comme au
   * site d'attaque : sans raid ouvert cette semaine, personne n'a encore
   * consommé quoi que ce soit ici.
   */
  async memberRaidStats(
    team: TeamWithMembers,
    now: Date = new Date(),
  ): Promise<RaidMemberStatsView> {
    const memberIds = team.members.map((m) => m.userId)
    const raid = await this.#raidRepository.findRaid(team.id, raidWeekKey(now))
    const [contributions, cfg, raidBonus, usedByUser] = await Promise.all([
      raid ? this.#contributions(raid.id, team) : Promise.resolve([]),
      this.#configService.getMany('raid.attacksPerDay'),
      this.#teamProgressionDomain.raidAttacksBonusForTeam(team.id),
      raid
        ? this.#raidRepository.countAttacksByUsersSince(
            raid.id,
            memberIds,
            utcDayStart(now),
          )
        : Promise.resolve(new Map<string, number>()),
    ])
    const attacksPerDay = cfg['raid.attacksPerDay'] + raidBonus
    const byUserId = new Map(contributions.map((c) => [c.user.id, c]))
    return {
      attacksPerDay,
      members: team.members.map((member) => {
        const contribution = byUserId.get(member.userId)
        return {
          userId: member.userId,
          damage: contribution?.damage ?? 0,
          attacks: contribution?.attacks ?? 0,
          attacksRemainingToday: attacksRemaining(
            usedByUser.get(member.userId) ?? 0,
            attacksPerDay,
          ),
        }
      }),
    }
  }

  async #requireMembership(
    teamId: string,
    userId: string,
  ): Promise<TeamWithMembers> {
    const membership = await this.#teamMemberRepository.findByTeamAndUser(
      teamId,
      userId,
    )
    if (!membership) {
      throw Boom.forbidden(errorMessage('team.notMember'))
    }
    const team = await this.#teamRepository.findById(teamId)
    if (!team) {
      throw Boom.notFound(errorMessage('team.notFound'))
    }
    return team
  }

  /**
   * Raid de la semaine, créé paresseusement. Le nombre de membres est figé
   * ici ; un membre qui arrive plus tard peut attaquer sans changer les PV.
   */
  async #ensureRaid(
    team: TeamWithMembers,
    now: Date,
  ): Promise<TeamRaidWithBoss> {
    const weekKey = raidWeekKey(now)
    const existing = await this.#raidRepository.findRaid(team.id, weekKey)
    if (existing) {
      return existing
    }
    const element = raidElementForWeek(weekKey)
    const boss = await this.#raidRepository.findBossByElement(element)
    if (!boss) {
      // Faute de contenu (migration de seed pas encore appliquée, ou boss
      // supprimé en base), pas une erreur du client : 503, pas 500/4xx, et
      // message générique côté client (le détail va au log serveur, pas au
      // joueur).
      this.#logger.error(
        `Raid : boss manquant pour l'élément ${element} (semaine ${weekKey}) — vérifier la migration seed_raid_content`,
      )
      throw Boom.serverUnavailable(errorMessage('raid.unavailable'))
    }
    const [cfg, last] = await Promise.all([
      this.#configService.getMany(
        'raid.baseHpPerMember',
        'raid.minMembers',
        'raid.levelHpBonusPct',
      ),
      this.#raidRepository.findLastRaidBefore(team.id, weekKey),
    ])
    const memberCount = team.members.length
    const level = nextRaidLevel(last, weekKey)
    return this.#raidRepository.upsertRaid({
      teamId: team.id,
      weekKey,
      bossId: boss.id,
      level,
      maxHp: raidMaxHp(cfg['raid.baseHpPerMember'], memberCount, {
        minMembers: cfg['raid.minMembers'],
        levelBonusPct: cfg['raid.levelHpBonusPct'],
        level,
      }),
      memberCountAtStart: memberCount,
    })
  }

  /**
   * Paliers applicables à un raid de niveau `level`, créés au besoin. Appelée
   * aussi bien à l'affichage qu'à l'attaque : sans cela, un joueur verrait
   * des lots calculés à la volée et en recevrait d'autres, persistés.
   */
  async #tiersFor(level: number): Promise<RaidTierWithReward[]> {
    const cfg = await this.#configService.getMany('raid.levelRewardPct')
    return this.#raidRepository.ensureTiersForLevel(
      level,
      cfg['raid.levelRewardPct'],
    )
  }

  async #contributions(
    raidId: string,
    team: TeamWithMembers,
  ): Promise<RaidContribution[]> {
    const rows = await this.#raidRepository.listContributions(raidId)
    const byUserId = new Map(team.members.map((m) => [m.userId, m.user]))
    return rows.map((r) => {
      const u = byUserId.get(r.userId)
      return {
        // Un membre parti en cours de semaine garde ses dégâts au tableau.
        user: u
          ? { id: u.id, username: u.username, avatar: u.avatar }
          : {
              id: r.userId,
              username: errorMessage('raid.formerMemberFallback'),
              avatar: null,
            },
        damage: r.damage,
        attacks: r.attacks,
      }
    })
  }

  async #buildView(
    raid: TeamRaidWithBoss,
    team: TeamWithMembers,
    userId: string,
    now: Date,
  ): Promise<RaidView> {
    // `raidAttacksBonusForTeam(team.id)`, PAS `effectsForUser(userId)` — même
    // raison qu'au site d'attaque : ce quota appartient à l'équipe dont le
    // boss est affiché, pas au meilleur rang du joueur toutes équipes
    // confondues. Idem pour `usedToday`, compté sur CE raid.
    const [tiers, contributions, cfg, usedToday, raidBonus] = await Promise.all(
      [
        this.#tiersFor(raid.level),
        this.#contributions(raid.id, team),
        this.#configService.getMany('raid.attacksPerDay'),
        this.#raidRepository.countUserAttacksSince(
          raid.id,
          userId,
          utcDayStart(now),
        ),
        this.#teamProgressionDomain.raidAttacksBonusForTeam(team.id),
      ],
    )
    const attacksPerDay = cfg['raid.attacksPerDay'] + raidBonus
    const damageDone = raid.maxHp - raid.hp
    const reached = new Set(
      crossedTiers(damageDone, raid.maxHp, tiers).map((t) => t.pct),
    )
    const spec = enemySpecSchema.parse(raid.boss.spec)
    const mine = contributions.find((c) => c.user.id === userId)
    return {
      id: raid.id,
      weekKey: raid.weekKey,
      endsAt: raidWeekEndsAt(raid.weekKey).toISOString(),
      boss: {
        name: raid.boss.name,
        element: raid.boss.element as TowerElement,
        imageUrl: resolveEnemyImageUrl(
          spec.appearance,
          (key) => this.#storageClient.publicUrl(key),
          this.#config.isDevelopment ? 'staging/' : '',
        ),
        power: unitPower(spec),
      },
      maxHp: raid.maxHp,
      hp: raid.hp,
      damageDone,
      memberCountAtStart: raid.memberCountAtStart,
      level: raid.level,
      killedAt: raid.killedAt ? raid.killedAt.toISOString() : null,
      tiers: tiers.map((t) => tierView(t, reached.has(t.pct))),
      me: {
        attacksPerDay,
        attacksRemainingToday: attacksRemaining(usedToday, attacksPerDay),
        damage: mine?.damage ?? 0,
        attacks: mine?.attacks ?? 0,
      },
      contributions,
    }
  }
}

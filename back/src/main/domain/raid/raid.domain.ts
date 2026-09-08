import Boom from '@hapi/boom'

import type { IocContainer } from '../../types/application/ioc'
import type { Config } from '../../types/application/config'
import type {
  IRaidDomain,
  RaidAttackResult,
  RaidContribution,
  RaidTierView,
  RaidView,
} from '../../types/domain/raid/raid.domain.interface'
import type { TeamWithMembers } from '../../types/domain/team/team.types'
import type { ConfigServiceInterface } from '../../types/infra/config/config.service.interface'
import type {
  IRaidRepository,
  RaidTierWithReward,
  TeamRaidWithBoss,
} from '../../types/infra/orm/repositories/raid.repository.interface'
import type { StorageClientInterface } from '../../types/infra/storage/storage-client'
import type { Logger } from '../../types/utils/logger'
import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { TeamMemberRepository } from '../../infra/orm/repositories/team-member.repository'
import type { TeamRepository } from '../../infra/orm/repositories/team.repository'
import type { RaidAttackEvent, WsManager } from '../../interfaces/ws/ws-manager'
import { unitPower } from '../campaign/campaign-power'
import { resolveEnemyImageUrl } from '../campaign/enemy-appearance'
import { simulateBattle } from '../combat/battle-simulator.domain'
import type { CombatStatsBaseline } from '../combat/combat-stats.domain'
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
  MAX_RAID_TEAM_SIZE,
  RAID_BOSS_SIM_HP,
  raidElementForWeek,
  raidMaxHp,
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
  }: IocContainer) {
    this.#configService = configService
    this.#config = config
    this.#storageClient = storageClient
    this.#teamRepository = teamRepository
    this.#teamMemberRepository = teamMemberRepository
    this.#raidRepository = raidRepository
    this.#postgresOrm = postgresOrm
    this.#wsManager = wsManager
    this.#logger = logger
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
    userCardIds: string[],
    now: Date = new Date(),
  ): Promise<RaidAttackResult> {
    if (userCardIds.length === 0 || userCardIds.length > MAX_RAID_TEAM_SIZE) {
      throw Boom.badRequest('Compose une équipe de 1 à 3 cartes pour le raid')
    }
    if (new Set(userCardIds).size !== userCardIds.length) {
      throw Boom.badRequest('Les cartes doivent être distinctes')
    }

    const team = await this.#requireMembership(teamId, userId)
    const raidId = (await this.#ensureRaid(team, now)).id

    // Config lue AVANT la transaction (pas d'I/O async étranger dans un tx
    // Serializable) — même motif que tower.domain#fight.
    const cfg = await this.#configService.getMany(
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
    )
    const setDefs = setBonusesFromConfig(cfg)
    const baseStats: CombatStatsBaseline = {
      critRate: cfg['combat.baseCritRate'],
      critDmg: cfg['combat.baseCritDmg'],
      armorPen: cfg['combat.baseArmorPen'],
      lifesteal: cfg['combat.baseLifesteal'],
    }
    const perDay = cfg['raid.attacksPerDay']

    const outcome = await retryOnSerialization(() =>
      this.#postgresOrm.executeWithTransactionClient(
        // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: motif calqué sur tower.domain#fight
        async (tx): Promise<RaidAttackResult> => {
          const raid = await tx.teamRaid.findUnique({
            where: { id: raidId },
            include: { boss: true },
          })
          if (!raid) {
            throw Boom.notFound('Raid introuvable')
          }
          if (raid.killedAt || raid.hp <= 0) {
            throw Boom.conflict(
              'Le boss est déjà vaincu, rendez-vous la semaine prochaine',
            )
          }

          const used = await tx.raidAttack.count({
            where: { userId, createdAt: { gte: utcDayStart(now) } },
          })
          if (used >= perDay) {
            throw Boom.tooManyRequests(
              "Plus d'attaque aujourd'hui, reviens demain",
            )
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
            throw Boom.badRequest(
              'Aucune des cartes fournies n’appartient à ce joueur',
            )
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
            throw Boom.badImplementation('Spec de boss invalide')
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
            // Clé sur la SEMAINE (raid.weekKey), pas sur le raid (raid.id) :
            // un raid est unique par équipe ET semaine, donc un joueur dans
            // plusieurs équipes a un raid.id différent par équipe la même
            // semaine. Clé sur raid.id lui ferait toucher le lot de palier
            // une fois par équipe (jusqu'à 5, MAX_TEAMS_PER_USER). Clé sur
            // la semaine + la contrainte unique [userId, source, sourceId]
            // fait que la 2e équipe qui franchit un palier déjà obtenu via
            // une autre équipe la même semaine ne redonne rien : le joueur
            // reçoit l'union des paliers de ses équipes, jamais la somme.
            await tx.userReward.createMany({
              data: participants.flatMap((p) =>
                after.map((t) => ({
                  userId: p.userId,
                  rewardId: t.rewardId,
                  source: 'RAID' as const,
                  sourceId: `${raid.weekKey}:${t.pct}`,
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
      attacker: { id: userId, username: attacker?.username ?? 'Un coéquipier' },
      damage: outcome.damage,
      killed: outcome.killed,
    }
    for (const member of team.members) {
      this.#wsManager.notify(member.userId, event)
    }

    return outcome
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
      throw Boom.forbidden('Tu ne fais pas partie de cette équipe')
    }
    const team = await this.#teamRepository.findById(teamId)
    if (!team) {
      throw Boom.notFound('Équipe introuvable')
    }
    return team
  }

  /**
   * Raid de la semaine, créé paresseusement. Le nombre de membres est figé
   * ici ; un membre qui arrive plus tard peut attaquer sans changer les PV.
   */
  async #ensureRaid(team: TeamWithMembers, now: Date): Promise<TeamRaidWithBoss> {
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
      throw Boom.serverUnavailable(
        'Raid indisponible pour le moment, réessaie plus tard',
      )
    }
    const cfg = await this.#configService.getMany('raid.baseHpPerMember')
    const memberCount = team.members.length
    return this.#raidRepository.upsertRaid({
      teamId: team.id,
      weekKey,
      bossId: boss.id,
      maxHp: raidMaxHp(cfg['raid.baseHpPerMember'], memberCount),
      memberCountAtStart: memberCount,
    })
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
          : { id: r.userId, username: 'Ancien membre', avatar: null },
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
    const [tiers, contributions, cfg, usedToday] = await Promise.all([
      this.#raidRepository.listTiers(),
      this.#contributions(raid.id, team),
      this.#configService.getMany('raid.attacksPerDay'),
      this.#raidRepository.countUserAttacksSince(userId, utcDayStart(now)),
    ])
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
      killedAt: raid.killedAt ? raid.killedAt.toISOString() : null,
      tiers: tiers.map((t) => tierView(t, reached.has(t.pct))),
      me: {
        attacksPerDay: cfg['raid.attacksPerDay'],
        attacksRemainingToday: attacksRemaining(usedToday, cfg['raid.attacksPerDay']),
        damage: mine?.damage ?? 0,
        attacks: mine?.attacks ?? 0,
      },
      contributions,
    }
  }
}

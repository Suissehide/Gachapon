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
import type { TeamMemberRepository } from '../../infra/orm/repositories/team-member.repository'
import type { TeamRepository } from '../../infra/orm/repositories/team.repository'
import { unitPower } from '../campaign/campaign-power'
import { resolveEnemyImageUrl } from '../campaign/enemy-appearance'
import { enemySpecSchema } from '../combat/sim-units'
import type { TowerElement } from '../tower/tower-slots'
import {
  attacksRemaining,
  crossedTiers,
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

  constructor({
    configService,
    config,
    storageClient,
    teamRepository,
    teamMemberRepository,
    raidRepository,
  }: IocContainer) {
    this.#configService = configService
    this.#config = config
    this.#storageClient = storageClient
    this.#teamRepository = teamRepository
    this.#teamMemberRepository = teamMemberRepository
    this.#raidRepository = raidRepository
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

  attack(
    _teamId: string,
    _userId: string,
    _userCardIds: string[],
    _now?: Date,
  ): Promise<RaidAttackResult> {
    // Implémentée en Task 7.
    throw Boom.notImplemented('Attaque de raid indisponible')
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
      throw Boom.badImplementation(
        `Boss de raid manquant pour ${element} — lancer le seed`,
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

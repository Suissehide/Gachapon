import type {
  CardElement,
  Prisma,
  RaidBoss,
} from '../../../../generated/client'
import type { IocContainer } from '../../../types/application/ioc'
import type {
  IRaidRepository,
  RaidContributionRow,
  RaidTierRewardPatch,
  RaidTierWithReward,
  TeamRaidWithBoss,
} from '../../../types/infra/orm/repositories/raid.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class RaidRepository implements IRaidRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  listBosses(): Promise<RaidBoss[]> {
    return this.#prisma.raidBoss.findMany({ orderBy: { element: 'asc' } })
  }

  findBossByElement(element: CardElement): Promise<RaidBoss | null> {
    return this.#prisma.raidBoss.findUnique({ where: { element } })
  }

  updateBoss(
    element: CardElement,
    data: { name?: string; spec?: Prisma.InputJsonValue },
  ): Promise<RaidBoss> {
    return this.#prisma.raidBoss.update({ where: { element }, data })
  }

  listTiers(): Promise<RaidTierWithReward[]> {
    return this.#prisma.raidTier.findMany({
      include: { reward: true },
      orderBy: { pct: 'asc' },
    })
  }

  findTierByPct(pct: number): Promise<RaidTierWithReward | null> {
    return this.#prisma.raidTier.findUnique({
      where: { pct },
      include: { reward: true },
    })
  }

  async updateTierReward(
    pct: number,
    data: RaidTierRewardPatch,
  ): Promise<RaidTierWithReward> {
    const tier = await this.#prisma.raidTier.findUniqueOrThrow({
      where: { pct },
    })
    await this.#prisma.reward.update({ where: { id: tier.rewardId }, data })
    return this.#prisma.raidTier.findUniqueOrThrow({
      where: { pct },
      include: { reward: true },
    })
  }

  findRaid(teamId: string, weekKey: string): Promise<TeamRaidWithBoss | null> {
    return this.#prisma.teamRaid.findUnique({
      where: { teamId_weekKey: { teamId, weekKey } },
      include: { boss: true },
    })
  }

  upsertRaid(data: {
    teamId: string
    weekKey: string
    bossId: string
    maxHp: number
    memberCountAtStart: number
  }): Promise<TeamRaidWithBoss> {
    return this.#prisma.teamRaid.upsert({
      where: { teamId_weekKey: { teamId: data.teamId, weekKey: data.weekKey } },
      create: { ...data, hp: data.maxHp },
      // Ne jamais écraser un raid existant : `update: {}` rend l'appel idempotent.
      update: {},
      include: { boss: true },
    })
  }

  async listContributions(raidId: string): Promise<RaidContributionRow[]> {
    const rows = await this.#prisma.raidAttack.groupBy({
      by: ['userId'],
      where: { raidId },
      _sum: { damage: true },
      _count: { _all: true },
      orderBy: { _sum: { damage: 'desc' } },
    })
    return rows.map((r) => ({
      userId: r.userId,
      damage: r._sum.damage ?? 0,
      attacks: r._count._all,
    }))
  }

  countUserAttacksSince(userId: string, since: Date): Promise<number> {
    return this.#prisma.raidAttack.count({
      where: { userId, createdAt: { gte: since } },
    })
  }
}

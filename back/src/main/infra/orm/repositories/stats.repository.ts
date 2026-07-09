import type { IocContainer } from '../../../types/application/ioc'
import type {
  IStatsRepository,
  PublicStats,
} from '../../../types/infra/orm/repositories/stats.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class StatsRepository implements IStatsRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  async getPublicStats(): Promise<PublicStats> {
    const now = Date.now()
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const [
      totalUsers,
      totalPulls,
      totalCards,
      activeUsersRaw,
      legendaryPulls,
      pullsToday,
      dustAgg,
      setsCount,
      legendaryCardsCount,
      activeTodayRaw,
      recentLegendariesRaw,
    ] = await Promise.all([
      this.#prisma.user.count(),
      this.#prisma.gachaPull.count(),
      this.#prisma.card.count(),
      this.#prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(DISTINCT "userId") AS count
        FROM "GachaPull"
        WHERE "pulledAt" >= ${sevenDaysAgo}
      `,
      this.#prisma.gachaPull.count({
        where: { card: { rarity: 'LEGENDARY' } },
      }),
      this.#prisma.gachaPull.count({
        where: { pulledAt: { gte: startOfToday } },
      }),
      this.#prisma.gachaPull.aggregate({ _sum: { dustEarned: true } }),
      this.#prisma.cardSet.count(),
      this.#prisma.card.count({ where: { rarity: 'LEGENDARY' } }),
      this.#prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(DISTINCT "userId") AS count
        FROM "GachaPull"
        WHERE "pulledAt" >= ${startOfToday}
      `,
      this.#prisma.gachaPull.findMany({
        where: { card: { rarity: 'LEGENDARY' } },
        orderBy: { pulledAt: 'desc' },
        take: 8,
        select: { pulledAt: true, card: { select: { name: true } } },
      }),
    ])

    return {
      totalUsers,
      totalPulls,
      totalCards,
      activeUsers: Number(activeUsersRaw[0]?.count ?? 0),
      legendaryPulls,
      pullsToday,
      totalDust: dustAgg._sum.dustEarned ?? 0,
      setsCount,
      legendaryCardsCount,
      activeToday: Number(activeTodayRaw[0]?.count ?? 0),
      recentLegendaries: recentLegendariesRaw.map((p) => ({
        cardName: p.card.name,
        pulledAt: p.pulledAt.toISOString(),
      })),
    }
  }
}

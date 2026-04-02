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
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [totalUsers, totalPulls, totalCards, activeUsersRaw, legendaryPulls] =
      await Promise.all([
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
      ])

    return {
      totalUsers,
      totalPulls,
      totalCards,
      activeUsers: Number(activeUsersRaw[0]?.count ?? 0),
      legendaryPulls,
    }
  }
}

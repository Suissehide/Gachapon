import type { IocContainer } from '../../../types/application/ioc'
import type {
  DashboardData,
  DetailedStats,
  IAdminStatsRepository,
} from '../../../types/infra/orm/repositories/admin-stats.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

const RARITIES = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']
const UPGRADE_TYPES = ['REGEN', 'LUCK', 'DUST_HARVEST', 'TOKEN_VAULT']

export class AdminStatsRepository implements IAdminStatsRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  async getDashboard(): Promise<DashboardData> {
    const now = new Date()
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    )
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [totalUsers, pullsToday, dustAgg, legendaryCount] = await Promise.all(
      [
        this.#prisma.user.count(),
        this.#prisma.gachaPull.count({
          where: { pulledAt: { gte: startOfToday } },
        }),
        this.#prisma.gachaPull.aggregate({ _sum: { dustEarned: true } }),
        this.#prisma.gachaPull.count({
          where: { card: { rarity: 'LEGENDARY' } },
        }),
      ],
    )

    const pullsSeries = await this.#prisma.$queryRaw<
      { day: Date; count: bigint }[]
    >`
      SELECT DATE_TRUNC('day', "pulledAt") AS day, COUNT(*) AS count
      FROM "GachaPull"
      WHERE "pulledAt" >= ${thirtyDaysAgo}
      GROUP BY DATE_TRUNC('day', "pulledAt")
      ORDER BY day ASC
    `

    return {
      kpis: {
        totalUsers,
        pullsToday,
        dustGenerated: dustAgg._sum.dustEarned ?? 0,
        legendaryCount,
      },
      pullsSeries: pullsSeries.map((r) => ({
        day: r.day.toISOString().slice(0, 10),
        count: Number(r.count),
      })),
    }
  }

  async getDetailedStats(): Promise<DetailedStats> {
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
      rarityReal,
      theoreticalWeights,
      neverPulledCards,
      activeUsers7d,
      activeUsers30d,
      upgradeRows,
      totalUsers,
    ] = await Promise.all([
      this.#prisma.$queryRaw<{ rarity: string; count: bigint }[]>`
        SELECT c.rarity, COUNT(*) AS count
        FROM "GachaPull" gp
        JOIN "Card" c ON c.id = gp."cardId"
        GROUP BY c.rarity
      `,
      this.#prisma.$queryRaw<{ rarity: string; weight: number }[]>`
        SELECT rarity, SUM("dropWeight") AS weight
        FROM "Card"
        GROUP BY rarity
      `,
      this.#prisma.card.findMany({
        where: { gachaPulls: { none: {} } },
        select: {
          id: true,
          name: true,
          rarity: true,
          set: { select: { name: true } },
        },
        orderBy: [{ rarity: 'asc' }, { name: 'asc' }],
      }),
      this.#prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(DISTINCT "userId") AS count
        FROM "GachaPull"
        WHERE "pulledAt" >= ${sevenDaysAgo}
      `,
      this.#prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(DISTINCT "userId") AS count
        FROM "GachaPull"
        WHERE "pulledAt" >= ${thirtyDaysAgo}
      `,
      this.#prisma.$queryRaw<{ type: string; level: number; count: bigint }[]>`
        SELECT type, level, COUNT(*) AS count
        FROM "UserUpgrade"
        GROUP BY type, level
        ORDER BY type, level
      `,
      this.#prisma.user.count(),
    ])

    const totalRealPulls = rarityReal.reduce((s, r) => s + Number(r.count), 0)
    const totalWeight = theoreticalWeights.reduce(
      (s, r) => s + Number(r.weight),
      0,
    )
    const rarityDrift = RARITIES.map((rarity) => {
      const real = rarityReal.find((r) => r.rarity === rarity)
      const theoretical = theoreticalWeights.find((r) => r.rarity === rarity)
      const realCount = real ? Number(real.count) : 0
      const realPct =
        totalRealPulls > 0 ? (realCount / totalRealPulls) * 100 : 0
      const theoreticalPct =
        totalWeight > 0 && theoretical
          ? (Number(theoretical.weight) / totalWeight) * 100
          : 0
      return { rarity, realCount, realPct, theoreticalPct }
    })

    const upgradeDistribution = UPGRADE_TYPES.map((type) => {
      const rows = upgradeRows.filter((r) => r.type === type)
      const countAtLevels = rows.reduce((s, r) => s + Number(r.count), 0)
      const levels = [
        { level: 0, count: totalUsers - countAtLevels },
        ...rows.map((r) => ({ level: r.level, count: Number(r.count) })),
      ]
      return { type, levels }
    })

    return {
      rarityDrift,
      neverPulledCards: neverPulledCards.map((c) => ({
        id: c.id,
        name: c.name,
        rarity: c.rarity,
        setName: c.set.name,
      })),
      activeUsers: {
        sevenDays: Number(activeUsers7d[0]?.count ?? 0),
        thirtyDays: Number(activeUsers30d[0]?.count ?? 0),
      },
      upgradeDistribution,
    }
  }
}

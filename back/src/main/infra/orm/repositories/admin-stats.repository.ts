import type { IocContainer } from '../../../types/application/ioc'
import type {
  DashboardData,
  DetailedStats,
  IAdminStatsRepository,
} from '../../../types/infra/orm/repositories/admin-stats.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

const RARITIES = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']

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
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
      totalUsers,
      pullsToday,
      dustAgg,
      legendaryCount,
      signups7d,
      signups30d,
      dustSpentAgg,
      totalPulls,
      activeUsers7dRows,
      activeUsers30dRows,
    ] = await Promise.all([
      this.#prisma.user.count(),
      this.#prisma.gachaPull.count({
        where: { pulledAt: { gte: startOfToday } },
      }),
      this.#prisma.gachaPull.aggregate({ _sum: { dustEarned: true } }),
      this.#prisma.gachaPull.count({
        where: { card: { rarity: 'LEGENDARY' } },
      }),
      this.#prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.#prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.#prisma.purchase.aggregate({
        _sum: { amountSpent: true },
        where: { currency: 'DUST' },
      }),
      this.#prisma.gachaPull.count(),
      this.#prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(DISTINCT "userId") AS count FROM "GachaPull"
        WHERE "pulledAt" >= ${sevenDaysAgo}
      `,
      this.#prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(DISTINCT "userId") AS count FROM "GachaPull"
        WHERE "pulledAt" >= ${thirtyDaysAgo}
      `,
    ])

    const pullsSeries = await this.#prisma.$queryRaw<
      { day: Date; count: bigint }[]
    >`
      SELECT DATE_TRUNC('day', "pulledAt") AS day, COUNT(*) AS count
      FROM "GachaPull"
      WHERE "pulledAt" >= ${thirtyDaysAgo}
      GROUP BY DATE_TRUNC('day', "pulledAt")
      ORDER BY day ASC
    `

    const signupsSeries = await this.#prisma.$queryRaw<
      { day: Date; count: bigint }[]
    >`
      SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*) AS count
      FROM "User"
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY day ASC
    `

    return {
      kpis: {
        totalUsers,
        pullsToday,
        dustGenerated: dustAgg._sum.dustEarned ?? 0,
        legendaryCount,
        signups7d,
        signups30d,
        activeUsers7d: Number(activeUsers7dRows[0]?.count ?? 0),
        activeUsers30d: Number(activeUsers30dRows[0]?.count ?? 0),
        dustSpent: dustSpentAgg._sum.amountSpent ?? 0,
        totalPulls,
      },
      pullsSeries: pullsSeries.map((r) => ({
        day: r.day.toISOString().slice(0, 10),
        count: Number(r.count),
      })),
      signupsSeries: signupsSeries.map((r) => ({
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
      skillRows,
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
      this.#prisma.$queryRaw<
        { nodeId: string; level: number; count: bigint }[]
      >`
        SELECT "nodeId", level, COUNT(*) AS count
        FROM "UserSkill"
        GROUP BY "nodeId", level
        ORDER BY "nodeId", level
      `,
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

    const skillDistribution = skillRows.map((r) => ({
      nodeId: String(r.nodeId),
      level: Number(r.level),
      count: Number(r.count),
    }))

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
      skillDistribution,
    }
  }
}

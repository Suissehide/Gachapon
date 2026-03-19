// back/src/main/interfaces/http/fastify/routes/admin/stats.router.ts
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

export const adminStatsRouter: FastifyPluginCallbackZod = (fastify) => {
  const auth = [fastify.verifySessionCookie, fastify.requireRole('SUPER_ADMIN')]

  // GET /admin/dashboard — KPIs + séries temporelles
  fastify.get('/dashboard', { onRequest: auth }, async () => {
    const { postgresOrm } = fastify.iocContainer
    const prisma = postgresOrm.prisma

    const now = new Date()
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    )
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [totalUsers, pullsToday, dustGenerated, legendaryCount] =
      await Promise.all([
        prisma.user.count(),
        prisma.gachaPull.count({ where: { pulledAt: { gte: startOfToday } } }),
        prisma.gachaPull.aggregate({ _sum: { dustEarned: true } }),
        prisma.gachaPull.count({ where: { card: { rarity: 'LEGENDARY' } } }),
      ])

    // Série temporelle pulls/jour sur 30 jours (PostgreSQL DATE_TRUNC)
    const pullsSeries = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
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
        dustGenerated: dustGenerated._sum.dustEarned ?? 0,
        legendaryCount,
      },
      pullsSeries: pullsSeries.map((r) => ({
        day: r.day.toISOString().slice(0, 10),
        count: Number(r.count),
      })),
    }
  })

  // GET /admin/stats — statistiques détaillées
  fastify.get('/stats', { onRequest: auth }, async () => {
    const { postgresOrm } = fastify.iocContainer
    const prisma = postgresOrm.prisma

    const [rarityDistribution, topCards, topUsers] = await Promise.all([
      prisma.$queryRaw<{ rarity: string; count: bigint }[]>`
        SELECT c.rarity, COUNT(*) AS count
        FROM "GachaPull" gp
        JOIN "Card" c ON c.id = gp."cardId"
        GROUP BY c.rarity
        ORDER BY count DESC
      `,
      prisma.$queryRaw<
        { cardId: string; name: string; rarity: string; count: bigint }[]
      >`
        SELECT gp."cardId", c.name, c.rarity, COUNT(*) AS count
        FROM "GachaPull" gp
        JOIN "Card" c ON c.id = gp."cardId"
        GROUP BY gp."cardId", c.name, c.rarity
        ORDER BY count DESC
        LIMIT 10
      `,
      prisma.$queryRaw<{ userId: string; username: string; count: bigint }[]>`
        SELECT gp."userId", u.username, COUNT(*) AS count
        FROM "GachaPull" gp
        JOIN "User" u ON u.id = gp."userId"
        GROUP BY gp."userId", u.username
        ORDER BY count DESC
        LIMIT 10
      `,
    ])

    return {
      rarityDistribution: rarityDistribution.map((r) => ({
        rarity: r.rarity,
        count: Number(r.count),
      })),
      topCards: topCards.map((r) => ({
        cardId: r.cardId,
        name: r.name,
        rarity: r.rarity,
        count: Number(r.count),
      })),
      topUsers: topUsers.map((r) => ({
        userId: r.userId,
        username: r.username,
        count: Number(r.count),
      })),
    }
  })
}

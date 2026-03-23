import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

export const statsRouter: FastifyPluginCallbackZod = (fastify) => {
  fastify.get('/stats', { schema: { tags: ['Stats'] } }, async () => {
    const { postgresOrm } = fastify.iocContainer
    const prisma = postgresOrm.prisma

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [totalUsers, totalPulls, totalCards, activeUsers, legendaryPulls] =
      await Promise.all([
        prisma.user.count(),
        prisma.gachaPull.count(),
        prisma.card.count(),
        prisma.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(DISTINCT "userId") AS count
          FROM "GachaPull"
          WHERE "pulledAt" >= ${sevenDaysAgo}
        `,
        prisma.gachaPull.count({ where: { card: { rarity: 'LEGENDARY' } } }),
      ])

    return {
      totalUsers,
      totalPulls,
      totalCards,
      activeUsers: Number(activeUsers[0]?.count ?? 0),
      legendaryPulls,
    }
  })
}

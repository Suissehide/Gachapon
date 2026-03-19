import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

export const leaderboardRouter: FastifyPluginCallbackZod = (fastify) => {
  const { postgresOrm } = fastify.iocContainer
  const prisma = postgresOrm.prisma

  // GET /leaderboard — 3 classements : collectionneurs, légendaires, meilleures équipes
  fastify.get(
    '/leaderboard',
    { onRequest: [fastify.verifySessionCookie] },
    async () => {
      // Nombre total de cartes dans les sets actifs
      const totalCards = await prisma.card.count({
        where: { set: { isActive: true } },
      })

      // Classement 1 : % de collection (collectionneurs)
      const collectorRows = await prisma.userCard.groupBy({
        by: ['userId'],
        _count: { cardId: true },
        orderBy: { _count: { cardId: 'desc' } },
        take: 10,
      })

      const collectorIds = collectorRows.map((r) => r.userId)
      const collectorUsers = await prisma.user.findMany({
        where: { id: { in: collectorIds } },
        select: { id: true, username: true, avatar: true },
      })
      const userMap = new Map(collectorUsers.map((u) => [u.id, u]))

      const collectors = collectorRows.map((r, i) => ({
        rank: i + 1,
        user: userMap.get(r.userId) ?? {
          id: r.userId,
          username: 'Unknown',
          avatar: null,
        },
        ownedCards: r._count.cardId,
        percentage:
          totalCards > 0 ? Math.round((r._count.cardId / totalCards) * 100) : 0,
      }))

      // Classement 2 : légendaires
      // Note: Prisma groupBy ne supporte pas les filtres relationnels — pré-fetch des IDs scalaires requis
      const legendaryCardIds = (
        await prisma.card.findMany({
          where: { rarity: 'LEGENDARY' },
          select: { id: true },
        })
      ).map((c) => c.id)
      const legendaryRows = await prisma.userCard.groupBy({
        by: ['userId'],
        where: { cardId: { in: legendaryCardIds } },
        _count: { cardId: true },
        orderBy: { _count: { cardId: 'desc' } },
        take: 10,
      })

      const legendaryIds = legendaryRows.map((r) => r.userId)
      const legendaryUsers = await prisma.user.findMany({
        where: { id: { in: legendaryIds } },
        select: { id: true, username: true, avatar: true },
      })
      const legendaryUserMap = new Map(legendaryUsers.map((u) => [u.id, u]))

      const legendaries = legendaryRows.map((r, i) => ({
        rank: i + 1,
        user: legendaryUserMap.get(r.userId) ?? {
          id: r.userId,
          username: 'Unknown',
          avatar: null,
        },
        legendaryCount: r._count.cardId,
      }))

      // Classement 3 : meilleures équipes (moyenne du % de collection des membres)
      const teams = await prisma.team.findMany({
        include: {
          members: { select: { userId: true } },
          _count: { select: { members: true } },
        },
        take: 20,
      })

      // Pré-fetch des IDs de cartes actives (groupBy ne supporte pas les filtres relationnels)
      const activeCardIds = (
        await prisma.card.findMany({
          where: { set: { isActive: true } },
          select: { id: true },
        })
      ).map((c) => c.id)

      // Pour chaque équipe, calculer le % moyen de collection de ses membres
      const teamScores = await Promise.all(
        teams.map(async (team) => {
          if (team.members.length === 0) {
            return { team, avgPercentage: 0 }
          }
          const memberIds = team.members.map((m) => m.userId)
          const ownedPerMember = await prisma.userCard.groupBy({
            by: ['userId'],
            where: { userId: { in: memberIds }, cardId: { in: activeCardIds } },
            _count: { cardId: true },
          })
          const ownedMap = new Map(
            ownedPerMember.map((r) => [r.userId, r._count.cardId]),
          )
          const totalPct = memberIds.reduce((sum, uid) => {
            const owned = ownedMap.get(uid) ?? 0
            return sum + (totalCards > 0 ? owned / totalCards : 0)
          }, 0)
          return {
            team,
            avgPercentage: Math.round((totalPct / memberIds.length) * 100),
          }
        }),
      )

      const bestTeams = teamScores
        .sort((a, b) => b.avgPercentage - a.avgPercentage)
        .slice(0, 10)
        .map((entry, i) => ({
          rank: i + 1,
          team: {
            id: entry.team.id,
            name: entry.team.name,
            slug: entry.team.slug,
            memberCount: entry.team._count.members,
          },
          avgPercentage: entry.avgPercentage,
        }))

      return { collectors, legendaries, bestTeams }
    },
  )

  // GET /quests — quêtes actives
  fastify.get(
    '/quests',
    { onRequest: [fastify.verifySessionCookie] },
    async () => {
      const quests = await prisma.quest.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      })
      return {
        quests: quests.map((q) => ({
          id: q.id,
          key: q.key,
          name: q.name,
          description: q.description,
          rewardTokens: q.rewardTokens,
          rewardDust: q.rewardDust,
        })),
      }
    },
  )
}

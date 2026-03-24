import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { calculateUserScore } from '../../../../../domain/scoring/scoring.domain'

export const leaderboardRouter: FastifyPluginCallbackZod = (fastify) => {
  const { postgresOrm, scoringConfigRepository } = fastify.iocContainer
  const prisma = postgresOrm.prisma

  // GET /leaderboard — 3 classements : collectionneurs, légendaires, meilleures équipes
  fastify.get(
    '/leaderboard',
    { onRequest: [fastify.verifySessionCookie] },
    async () => {
      const config = await scoringConfigRepository.get()

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

      // Bulk fetch all user cards for all team members at once (avoids N+1)
      const allMemberIds = [...new Set(teams.flatMap((t) => t.members.map((m) => m.userId)))]
      const allUserCards = await prisma.userCard.findMany({
        where: { userId: { in: allMemberIds } },
        select: {
          userId: true,
          variant: true,
          quantity: true,
          card: { select: { rarity: true } },
        },
      })
      const cardsByUser = new Map<string, typeof allUserCards>()
      for (const uc of allUserCards) {
        const list = cardsByUser.get(uc.userId) ?? []
        list.push(uc)
        cardsByUser.set(uc.userId, list)
      }

      const teamScores = teams.map((team) => {
        const memberIds = team.members.map((m) => m.userId)
        const avgScore =
          memberIds.length > 0
            ? Math.round(
                memberIds.reduce(
                  (sum, uid) => sum + calculateUserScore(cardsByUser.get(uid) ?? [], config),
                  0,
                ) / memberIds.length,
              )
            : 0
        return { team, avgScore }
      })

      const bestTeams = teamScores
        .sort((a, b) => b.avgScore - a.avgScore)
        .slice(0, 10)
        .map((entry, i) => ({
          rank: i + 1,
          team: {
            id: entry.team.id,
            name: entry.team.name,
            slug: entry.team.slug,
            memberCount: entry.team._count.members,
          },
          avgScore: entry.avgScore,
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

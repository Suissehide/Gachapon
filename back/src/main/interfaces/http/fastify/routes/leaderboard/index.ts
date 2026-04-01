import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { calculateUserScore } from '../../../../../domain/scoring/scoring.domain'

export const leaderboardRouter: FastifyPluginCallbackZod = (fastify) => {
  const { leaderboardRepository, scoringConfigRepository } = fastify.iocContainer

  fastify.get(
    '/leaderboard',
    { onRequest: [fastify.verifySessionCookie] },
    async () => {
      const config = await scoringConfigRepository.get()
      const totalCards = await leaderboardRepository.countActiveCards()

      const collectorRows = await leaderboardRepository.getCollectorRows(10)
      const collectorIds = collectorRows.map((r) => r.userId)
      const collectorUsers = await leaderboardRepository.getUsersByIds(collectorIds)
      const userMap = new Map(collectorUsers.map((u) => [u.id, u]))

      const collectors = collectorRows.map((r, i) => ({
        rank: i + 1,
        user: userMap.get(r.userId) ?? { id: r.userId, username: 'Unknown', avatar: null },
        ownedCards: r._count.cardId,
        percentage: totalCards > 0 ? Math.round((r._count.cardId / totalCards) * 100) : 0,
      }))

      const legendaryCardIds = await leaderboardRepository.getLegendaryCardIds()
      const legendaryRows = await leaderboardRepository.getLegendaryRows(legendaryCardIds, 10)
      const legendaryIds = legendaryRows.map((r) => r.userId)
      const legendaryUsers = await leaderboardRepository.getUsersByIds(legendaryIds)
      const legendaryUserMap = new Map(legendaryUsers.map((u) => [u.id, u]))

      const legendaries = legendaryRows.map((r, i) => ({
        rank: i + 1,
        user: legendaryUserMap.get(r.userId) ?? { id: r.userId, username: 'Unknown', avatar: null },
        legendaryCount: r._count.cardId,
      }))

      const teams = await leaderboardRepository.getTeamsWithMembers(20)
      const allMemberIds = [...new Set(teams.flatMap((t) => t.members.map((m) => m.userId)))]
      const allUserCards = await leaderboardRepository.getUserCardsByUserIds(allMemberIds)

      const cardsByUser = new Map<string, typeof allUserCards>()
      for (const uc of allUserCards) {
        const list = cardsByUser.get(uc.userId) ?? []
        list.push(uc)
        cardsByUser.set(uc.userId, list)
      }

      const bestTeams = teams
        .map((team) => {
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

  fastify.get(
    '/quests',
    { onRequest: [fastify.verifySessionCookie] },
    async () => {
      const quests = await leaderboardRepository.getActiveQuests()
      return {
        quests: quests.map((q) => ({
          id: q.id,
          key: q.key,
          name: q.name,
          description: q.description,
          rewardTokens: q.reward?.tokens ?? 0,
          rewardDust: q.reward?.dust ?? 0,
        })),
      }
    },
  )
}

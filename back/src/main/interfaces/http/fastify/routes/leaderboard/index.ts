import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

export const leaderboardRouter: FastifyPluginCallbackZod = (fastify) => {
  const { leaderboardDomain, leaderboardRepository } = fastify.iocContainer

  fastify.get(
    '/leaderboard/collectors',
    { onRequest: [fastify.verifySessionCookie] },
    async (request) => {
      return await leaderboardDomain.getCollectorsLeaderboard(
        request.user.userID,
      )
    },
  )

  fastify.get(
    '/leaderboard/teams',
    { onRequest: [fastify.verifySessionCookie] },
    async (request) => {
      return await leaderboardDomain.getTeamsLeaderboard(request.user.userID)
    },
  )

  fastify.get(
    '/leaderboard/combat',
    { onRequest: [fastify.verifySessionCookie] },
    async (request) => {
      return await leaderboardDomain.getCombatLeaderboard(request.user.userID)
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

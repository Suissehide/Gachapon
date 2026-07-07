import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

export const leaderboardRouter: FastifyPluginCallbackZod = (fastify) => {
  const { leaderboardDomain } = fastify.iocContainer

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
}

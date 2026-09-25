import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import {
  collectorsLeaderboardResponseSchema,
  combatLeaderboardResponseSchema,
  leaderboardQuerySchema,
  teamsLeaderboardResponseSchema,
} from '../../schemas/leaderboard.schema'

export const leaderboardRouter: FastifyPluginCallbackZod = (fastify) => {
  const { leaderboardDomain } = fastify.iocContainer

  fastify.get(
    '/leaderboard/collectors',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        querystring: leaderboardQuerySchema,
        summary: 'Get the collectors leaderboard',
        response: { 200: collectorsLeaderboardResponseSchema },
      },
    },
    async (request) => {
      return await leaderboardDomain.getCollectorsLeaderboard(
        request.user.userID,
        request.query.page,
      )
    },
  )

  fastify.get(
    '/leaderboard/teams',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        querystring: leaderboardQuerySchema,
        summary: 'Get the teams leaderboard',
        response: { 200: teamsLeaderboardResponseSchema },
      },
    },
    async (request) => {
      return await leaderboardDomain.getTeamsLeaderboard(
        request.user.userID,
        request.query.page,
      )
    },
  )

  fastify.get(
    '/leaderboard/combat',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        querystring: leaderboardQuerySchema,
        summary: 'Get the combat leaderboard',
        response: { 200: combatLeaderboardResponseSchema },
      },
    },
    async (request) => {
      return await leaderboardDomain.getCombatLeaderboard(
        request.user.userID,
        request.query.page,
      )
    },
  )
}

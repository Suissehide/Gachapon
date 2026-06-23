import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import {
  combatDebugBattleBodySchema,
  combatDebugBattleResponseSchema,
  combatTeamPutBodySchema,
  combatTeamResponseSchema,
} from '../../schemas/combat.schema'

export const combatRouter: FastifyPluginCallbackZod = (fastify) => {
  const { combatTeamTx, combatDebugDomain } = fastify.iocContainer

  fastify.get(
    '/combat/team',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { response: { 200: combatTeamResponseSchema } },
    },
    (request) => combatTeamTx.getTeam(request.user.userID),
  )

  fastify.put(
    '/combat/team',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        body: combatTeamPutBodySchema,
        response: { 200: combatTeamResponseSchema },
      },
    },
    (request) =>
      combatTeamTx.setTeam(request.user.userID, request.body.userCardIds),
  )

  fastify.post(
    '/combat/debug/battle',
    {
      onRequest: [
        fastify.verifySessionCookie,
        fastify.requireRole('SUPER_ADMIN'),
      ],
      schema: {
        body: combatDebugBattleBodySchema,
        response: { 200: combatDebugBattleResponseSchema },
      },
    },
    (request) => combatDebugDomain.run(request.body),
  )
}

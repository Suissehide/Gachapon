import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import {
  raidAttackBodySchema,
  raidAttackResponseSchema,
  raidContributionsResponseSchema,
  raidTeamParamSchema,
  raidViewResponseSchema,
} from '../../schemas/raid.schema'

export const raidsRouter: FastifyPluginCallbackZod = (fastify) => {
  const { raidDomain } = fastify.iocContainer

  fastify.get(
    '/teams/:id/raid',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        tags: ['Raid'],
        params: raidTeamParamSchema,
        response: { 200: raidViewResponseSchema },
      },
    },
    (request) => raidDomain.getRaid(request.params.id, request.user.userID),
  )

  fastify.get(
    '/teams/:id/raid/contributions',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        tags: ['Raid'],
        params: raidTeamParamSchema,
        response: { 200: raidContributionsResponseSchema },
      },
    },
    async (request) => ({
      contributions: await raidDomain.getContributions(
        request.params.id,
        request.user.userID,
      ),
    }),
  )

  fastify.post(
    '/teams/:id/raid/attack',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        tags: ['Raid'],
        params: raidTeamParamSchema,
        body: raidAttackBodySchema,
        response: { 200: raidAttackResponseSchema },
      },
    },
    (request) =>
      raidDomain.attack(
        request.params.id,
        request.user.userID,
        request.body.userCardIds,
      ),
  )
}

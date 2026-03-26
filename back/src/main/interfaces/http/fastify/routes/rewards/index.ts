import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

export const rewardsRouter: FastifyPluginCallbackZod = (fastify) => {
  const { rewardsDomain } = fastify.iocContainer

  // GET /rewards/pending — list unclaimed rewards for the current user
  fastify.get(
    '/pending',
    { onRequest: [fastify.verifySessionCookie] },
    async (request) => {
      return rewardsDomain.getPending(request.user.userID)
    },
  )

  // POST /rewards/:id/claim — claim a single reward
  fastify.post(
    '/:id/claim',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        params: z.object({ id: z.string() }),
      },
    },
    async (request) => {
      return rewardsDomain.claimOne(request.params.id, request.user.userID)
    },
  )

  // POST /rewards/claim-all — claim all pending rewards
  fastify.post(
    '/claim-all',
    { onRequest: [fastify.verifySessionCookie] },
    async (request, reply) => {
      const result = await rewardsDomain.claimAll(request.user.userID)
      if (result === null) {
        return reply.status(204).send()
      }
      return result
    },
  )

  // GET /rewards/history — paginated reward history
  fastify.get(
    '/history',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        querystring: z.object({
          page: z.coerce.number().int().min(1).default(1),
          limit: z.coerce.number().int().min(1).max(100).default(20),
        }),
      },
    },
    async (request) => {
      const { page, limit } = request.query
      const { data, total } = await rewardsDomain.getHistory(
        request.user.userID,
        page,
        limit,
      )
      return { data, total, page, limit }
    },
  )
}

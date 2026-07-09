import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import {
  claimResultSchema,
  claimRewardParamsSchema,
  noBodySchema,
  pendingRewardsResponseSchema,
  rewardsHistoryQuerySchema,
  rewardsHistoryResponseSchema,
} from '../../schemas/rewards.schemas'

export const rewardsRouter: FastifyPluginCallbackZod = (fastify) => {
  const { rewardsDomain, storageClient } = fastify.iocContainer

  // Granted cards carry a storage key in `imageUrl`; resolve it to a public URL
  // so the front reveal renders the art instead of the not-found placeholder.
  const resolveClaimCards = <
    T extends { cards?: { card: { imageUrl: string | null } }[] },
  >(
    result: T,
  ): T => {
    if (!result.cards) {
      return result
    }
    return {
      ...result,
      cards: result.cards.map((entry) => ({
        ...entry,
        card: {
          ...entry.card,
          imageUrl: entry.card.imageUrl
            ? storageClient.publicUrl(entry.card.imageUrl)
            : null,
        },
      })),
    }
  }

  // GET /rewards/pending — list unclaimed rewards for the current user
  fastify.get(
    '/pending',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { response: { 200: pendingRewardsResponseSchema } },
    },
    (request) => {
      return rewardsDomain.getPending(request.user.userID)
    },
  )

  // POST /rewards/:id/claim — claim a single reward
  fastify.post(
    '/:id/claim',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        params: claimRewardParamsSchema,
        response: { 200: claimResultSchema },
      },
    },
    async (request) => {
      const result = await rewardsDomain.claimOne(
        request.params.id,
        request.user.userID,
      )
      return resolveClaimCards(result)
    },
  )

  // POST /rewards/claim-all — claim all pending rewards
  fastify.post(
    '/claim-all',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { response: { 200: claimResultSchema, 204: noBodySchema } },
    },
    async (request, reply) => {
      const result = await rewardsDomain.claimAll(request.user.userID)
      if (result === null) {
        return reply.status(204).send(null)
      }
      return resolveClaimCards(result)
    },
  )

  // GET /rewards/history — paginated reward history
  fastify.get(
    '/history',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        querystring: rewardsHistoryQuerySchema,
        response: { 200: rewardsHistoryResponseSchema },
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

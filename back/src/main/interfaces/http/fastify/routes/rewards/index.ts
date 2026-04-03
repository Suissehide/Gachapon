import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

const claimResultSchema = z.object({
  tokens: z.number().int(),
  dust: z.number().int(),
  xp: z.number().int(),
  level: z.number().int(),
  pendingRewardsCount: z.number().int().nonnegative(),
})

const pendingRewardSchema = z.object({
  id: z.string().uuid(),
  source: z.enum(['STREAK', 'ACHIEVEMENT', 'QUEST']),
  sourceId: z.string().nullable(),
  claimedAt: z.date().nullable(),
  createdAt: z.date(),
  reward: z.object({
    tokens: z.number().int(),
    dust: z.number().int(),
    xp: z.number().int(),
  }),
  streakMilestone: z
    .object({ day: z.number().int(), isMilestone: z.boolean() })
    .nullable(),
})

const historyItemSchema = z.object({
  id: z.string().uuid(),
  source: z.enum(['STREAK', 'ACHIEVEMENT', 'QUEST']),
  sourceId: z.string().nullable(),
  claimedAt: z.date().nullable(),
  createdAt: z.date(),
  reward: z.object({
    tokens: z.number().int(),
    dust: z.number().int(),
    xp: z.number().int(),
  }),
})

export const rewardsRouter: FastifyPluginCallbackZod = (fastify) => {
  const { rewardsDomain } = fastify.iocContainer

  // GET /rewards/pending — list unclaimed rewards for the current user
  fastify.get(
    '/pending',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        response: { 200: z.array(pendingRewardSchema) },
      },
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
        params: z.object({ id: z.string().uuid() }),
        response: { 200: claimResultSchema },
      },
    },
    (request) => {
      return rewardsDomain.claimOne(request.params.id, request.user.userID)
    },
  )

  // POST /rewards/claim-all — claim all pending rewards
  fastify.post(
    '/claim-all',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        response: { 200: claimResultSchema, 204: z.null() },
      },
    },
    async (request, reply) => {
      const result = await rewardsDomain.claimAll(request.user.userID)
      if (result === null) {
        return reply.status(204).send(null)
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
        response: {
          200: z.object({
            data: z.array(historyItemSchema),
            total: z.number().int(),
            page: z.number().int(),
            limit: z.number().int(),
          }),
        },
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

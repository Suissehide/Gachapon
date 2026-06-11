import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

const achievementSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string(),
  family: z.string().nullable(),
  tier: z.number().int(),
  hidden: z.boolean(),
  iconKey: z.string().nullable(),
  sortOrder: z.number().int(),
  progress: z.number().int(),
  threshold: z.number().int(),
  unlocked: z.boolean(),
  unlockedAt: z.date().nullable(),
  reward: z
    .object({
      tokens: z.number().int(),
      dust: z.number().int(),
      xp: z.number().int(),
      cardRarity: z.string().nullable(),
    })
    .nullable(),
})

const familySummarySchema = z.object({
  family: z.string(),
  total: z.number().int(),
  unlocked: z.number().int(),
})

export const achievementsRouter: FastifyPluginCallbackZod = (fastify) => {
  const { achievementsDomain } = fastify.iocContainer

  // GET /achievements — list all achievements with progress for the current user
  fastify.get(
    '/',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { response: { 200: z.array(achievementSchema) } },
    },
    (request) => achievementsDomain.listForUser(request.user.userID),
  )

  // GET /achievements/families — list family summaries for the current user
  fastify.get(
    '/families',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { response: { 200: z.array(familySummarySchema) } },
    },
    (request) => achievementsDomain.listFamilies(request.user.userID),
  )
}

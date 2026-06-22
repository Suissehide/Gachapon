import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import {
  achievementsFamiliesResponseSchema,
  achievementsListResponseSchema,
} from '../../schemas/achievements.schemas'

export const achievementsRouter: FastifyPluginCallbackZod = (fastify) => {
  const { achievementsDomain } = fastify.iocContainer

  // GET /achievements — list all achievements with progress for the current user
  fastify.get(
    '/',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { response: { 200: achievementsListResponseSchema } },
    },
    (request) => achievementsDomain.listForUser(request.user.userID),
  )

  // GET /achievements/families — list family summaries for the current user
  fastify.get(
    '/families',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { response: { 200: achievementsFamiliesResponseSchema } },
    },
    (request) => achievementsDomain.listFamilies(request.user.userID),
  )
}

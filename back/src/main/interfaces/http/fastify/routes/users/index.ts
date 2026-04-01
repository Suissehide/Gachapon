import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { userProfileResponseSchema, usersProfileParamSchema, usersSearchQuerySchema } from '../../schemas/users.schema'

export const usersRouter: FastifyPluginCallbackZod = (fastify) => {
  const { userRepository, gachaPullRepository, userCardRepository } = fastify.iocContainer

  fastify.get(
    '/users/search',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { querystring: usersSearchQuerySchema },
    },
    async (request) => {
      const users = await userRepository.searchByUsername(request.query.q, request.user.userID)
      return { users }
    },
  )

  fastify.get(
    '/users/:username/profile',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        params: usersProfileParamSchema,
        response: { 200: userProfileResponseSchema },
      },
    },
    async (request) => {
      const user = await userRepository.findByUsername(request.params.username)
      if (!user) throw Boom.notFound('User not found')

      const [totalPulls, ownedCards, legendaryCount, dustGenerated] = await Promise.all([
        gachaPullRepository.countByUser(user.id),
        userCardRepository.countByUser(user.id),
        userCardRepository.countLegendaryByUser(user.id),
        gachaPullRepository.sumDustEarnedByUser(user.id),
      ])

      return {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        banner: user.banner,
        level: user.level,
        xp: user.xp,
        dust: user.dust,
        createdAt: user.createdAt,
        stats: { totalPulls, ownedCards, legendaryCount, dustGenerated },
        streakDays: user.streakDays,
        bestStreak: user.bestStreak,
      }
    },
  )
}

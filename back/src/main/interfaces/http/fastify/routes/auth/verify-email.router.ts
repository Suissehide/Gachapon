import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import {
  userResponseSchema,
  verifyEmailBodySchema,
} from '../../schemas/auth.schemas'
import { sanitizeUser, setTokenCookies } from './helpers'

export const verifyEmailRouter: FastifyPluginCallbackZod = (fastify) => {
  const { authDomain, userRewardRepository } = fastify.iocContainer

  fastify.post(
    '/',
    {
      config: { rateLimit: { max: 10, timeWindow: 15 * 60 * 1000 } },
      schema: {
        body: verifyEmailBodySchema,
        response: { 200: userResponseSchema },
      },
    },
    async (request, reply) => {
      const { user, tokens, unlockedAchievements } =
        await authDomain.verifyEmail(request.body.token)
      setTokenCookies(reply, tokens)
      const pendingRewardsCount = await userRewardRepository.countPendingByUser(
        user.id,
      )
      return {
        ...sanitizeUser(user),
        pendingRewardsCount,
        unlockedAchievements,
      }
    },
  )
}

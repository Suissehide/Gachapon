import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { sanitizeUser, setTokenCookies } from './helpers'
import { userResponseSchema } from './schemas'

export const verifyEmailRouter: FastifyPluginCallbackZod = (fastify) => {
  const { authDomain, userRewardRepository } = fastify.iocContainer

  fastify.post(
    '/',
    {
      config: { rateLimit: { max: 10, timeWindow: 15 * 60 * 1000 } },
      schema: {
        body: z.object({ token: z.string().uuid() }),
        response: { 200: userResponseSchema },
      },
    },
    async (request, reply) => {
      const { user, tokens } = await authDomain.verifyEmail(request.body.token)
      setTokenCookies(reply, tokens)
      const pendingRewardsCount = await userRewardRepository.countPendingByUser(user.id)
      return { ...sanitizeUser(user), pendingRewardsCount }
    },
  )
}

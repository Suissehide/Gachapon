import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { sanitizeUser } from './helpers'
import { userResponseSchema } from './schemas'

export const meRouter: FastifyPluginCallbackZod = (fastify) => {
  const { userDomain, userRewardRepository, streakDomain, postgresOrm } =
    fastify.iocContainer

  fastify.get(
    '/',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { response: { 200: userResponseSchema } },
    },
    async (request) => {
      const userId = request.user.userID

      try {
        await postgresOrm.executeWithTransactionClient(async (tx) => {
          await streakDomain.updateStreak(userId, tx)
        })
      } catch (err) {
        console.error('[StreakDomain] updateStreak failed:', err)
      }

      const user = await userDomain.findById(userId)
      if (!user) {
        throw Boom.notFound('User not found')
      }
      const pendingRewardsCount = await userRewardRepository.countPendingByUser(
        user.id,
      )
      return { ...sanitizeUser(user), pendingRewardsCount }
    },
  )
}

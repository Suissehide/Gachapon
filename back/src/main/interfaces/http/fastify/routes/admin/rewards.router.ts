import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { adminBulkRewardBodySchema } from '../../schemas/admin-rewards.schema'

export const adminRewardsRouter: FastifyPluginCallbackZod = (fastify) => {
  const { rewardsDomain, activityDomain } = fastify.iocContainer

  fastify.post(
    '/bulk',
    { schema: { body: adminBulkRewardBodySchema } },
    async (request, reply) => {
      const { target, reward, message } = request.body
      const { count } = await rewardsDomain.grantBulk({
        userIds: target === 'ALL' ? 'ALL' : target.userIds,
        tokens: reward.tokens,
        dust: reward.dust,
        xp: reward.xp,
        gold: reward.gold,
        cardRarity: reward.cardRarity,
        label: message,
      })
      void activityDomain.record('BULK_REWARD', {
        payload: {
          count,
          target: target === 'ALL' ? 'ALL' : 'SELECTION',
          reward,
          by: request.user.userID,
        },
      })
      return reply.status(201).send({ count })
    },
  )
}

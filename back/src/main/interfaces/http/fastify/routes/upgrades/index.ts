import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { upgradeTypeParamSchema } from '../../schemas/upgrades.schema'
import type { UpgradeType } from '../../../../../types/domain/economy/upgrade-purchase.domain.interface'

export const upgradesRouter: FastifyPluginCallbackZod = (fastify) => {
  const { upgradePurchaseDomain } = fastify.iocContainer

  fastify.get(
    '/upgrades',
    { onRequest: [fastify.verifySessionCookie] },
    async (request) => {
      return upgradePurchaseDomain.getUserUpgradesInfo(request.user.userID)
    },
  )

  fastify.post(
    '/upgrades/:type/buy',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: upgradeTypeParamSchema },
    },
    async (request) => {
      return upgradePurchaseDomain.buy(request.user.userID, request.params.type as UpgradeType)
    },
  )
}

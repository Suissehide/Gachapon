import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import type { UpgradeType } from '../../../../../types/domain/economy/upgrade-purchase.domain.interface'
import { upgradeTypeParamSchema } from '../../schemas/upgrades.schema'

export const upgradesRouter: FastifyPluginCallbackZod = (fastify) => {
  const { upgradePurchaseDomain } = fastify.iocContainer

  fastify.get(
    '/upgrades',
    { onRequest: [fastify.verifySessionCookie] },
    (request) => {
      return upgradePurchaseDomain.getUserUpgradesInfo(request.user.userID)
    },
  )

  fastify.post(
    '/upgrades/:type/buy',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: upgradeTypeParamSchema },
    },
    (request) => {
      return upgradePurchaseDomain.buy(
        request.user.userID,
        request.params.type as UpgradeType,
      )
    },
  )
}

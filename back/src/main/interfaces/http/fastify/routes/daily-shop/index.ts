import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { dailyShopItemIdParamSchema } from '../../schemas/daily-shop.schema'

export const dailyShopRouter: FastifyPluginCallbackZod = (fastify) => {
  const { dailyShopDomain } = fastify.iocContainer

  fastify.get(
    '/daily-shop',
    { onRequest: [fastify.verifySessionCookie] },
    (request) => {
      return dailyShopDomain.getOrGenerate(request.user.userID)
    },
  )

  fastify.post(
    '/daily-shop/:itemId/buy',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: dailyShopItemIdParamSchema },
    },
    (request) => {
      return dailyShopDomain.buy(request.user.userID, request.params.itemId)
    },
  )
}

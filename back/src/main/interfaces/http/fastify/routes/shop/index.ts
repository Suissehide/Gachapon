import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { shopItemIdParamSchema } from '../../schemas/shop.schema'

export const shopRouter: FastifyPluginCallbackZod = (fastify) => {
  const { shopItemRepository, shopDomain } = fastify.iocContainer

  fastify.get(
    '/shop',
    { onRequest: [fastify.verifySessionCookie] },
    async () => {
      const items = await shopItemRepository.findActive()
      return {
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          type: item.type,
          dustCost: item.dustCost,
          value: item.value,
        })),
      }
    },
  )

  fastify.post(
    '/shop/:id/buy',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: shopItemIdParamSchema },
    },
    (request) => {
      return shopDomain.buy(request.user.userID, request.params.id)
    },
  )
}

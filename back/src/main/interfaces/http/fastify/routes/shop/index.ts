import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import {
  buyShopItemResponseSchema,
  shopItemIdParamSchema,
} from '../../schemas/shop.schema'

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

  fastify.get(
    '/shop/machines',
    { onRequest: [fastify.verifySessionCookie] },
    async (request) => {
      const purchases = await fastify.iocContainer.postgresOrm.prisma.purchase.findMany({
        where: {
          userId: request.user.userID,
          shopItem: { type: 'MACHINE' },
        },
        include: { shopItem: true },
      })
      return {
        machineIds: purchases.map((p) => (p.shopItem.value as { machineId: string }).machineId),
      }
    },
  )

  fastify.post(
    '/shop/:id/buy',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        params: shopItemIdParamSchema,
        response: { 200: buyShopItemResponseSchema },
      },
    },
    (request) => {
      return shopDomain.buy(request.user.userID, request.params.id)
    },
  )
}

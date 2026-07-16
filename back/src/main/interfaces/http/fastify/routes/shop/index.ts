import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import {
  buyShopItemResponseSchema,
  getShopResponseSchema,
  shopItemIdParamSchema,
} from '../../schemas/shop.schema'

export const shopRouter: FastifyPluginCallbackZod = (fastify) => {
  const { shopItemRepository, shopDomain, userBoostRepository } =
    fastify.iocContainer

  fastify.get(
    '/shop',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { response: { 200: getShopResponseSchema } },
    },
    async (request) => {
      const userId = request.user.userID
      const [items, activeBoosts] = await Promise.all([
        shopItemRepository.findActive(),
        userBoostRepository.findActiveByUser(userId),
      ])
      return {
        items: items.map((item) => {
          let activeBoost: { pullsRemaining: number } | null = null
          if (item.type === 'BOOST') {
            const boostValue = item.value as {
              multiplier?: number
              guaranteedRarity?: string
            }
            const isWeightBoost = boostValue.multiplier != null
            const matchingBoost = isWeightBoost
              ? activeBoosts.find((b) => b.weightMultiplier != null)
              : activeBoosts.find((b) => b.guaranteedRarity != null)
            if (matchingBoost) {
              activeBoost = { pullsRemaining: matchingBoost.pullsRemaining }
            }
          }
          return {
            id: item.id,
            name: item.name,
            description: item.description,
            type: item.type,
            cost: item.cost,
            currency: item.currency,
            value: item.value,
            activeBoost,
          }
        }),
      }
    },
  )

  fastify.get(
    '/shop/machines',
    { onRequest: [fastify.verifySessionCookie] },
    async (request) => {
      const purchases =
        await fastify.iocContainer.postgresOrm.prisma.purchase.findMany({
          where: {
            userId: request.user.userID,
            shopItem: { type: 'MACHINE' },
          },
          include: { shopItem: true },
        })
      return {
        machineIds: purchases.map(
          (p) => (p.shopItem.value as { machineId: string }).machineId,
        ),
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
    async (request) => {
      const result = await shopDomain.buy(
        request.user.userID,
        request.params.id,
      )
      void fastify.iocContainer.activityDomain.record('SHOP_PURCHASE', {
        userId: request.user.userID,
        payload: { shopItemId: request.params.id },
      })
      return result
    },
  )
}

import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { dailyShopItemIdParamSchema } from '../../schemas/daily-shop.schema'

export const dailyShopRouter: FastifyPluginCallbackZod = (fastify) => {
  const { dailyShopDomain, storageClient } = fastify.iocContainer

  const resolveUrl = (key: string | null) =>
    key ? storageClient.publicUrl(key) : null

  const resolveItems = (
    items: {
      id: string
      card: {
        id: string
        name: string
        imageUrl: string | null
        rarity: string
        set: { id: string; name: string }
      }
      dustPrice: number
      purchased: boolean
      owned: boolean
    }[],
  ) =>
    items.map((item) => ({
      ...item,
      card: { ...item.card, imageUrl: resolveUrl(item.card.imageUrl) },
    }))

  fastify.get(
    '/daily-shop',
    { onRequest: [fastify.verifySessionCookie] },
    async (request) => {
      const result = await dailyShopDomain.getOrGenerate(request.user.userID)
      return { ...result, items: resolveItems(result.items) }
    },
  )

  fastify.post(
    '/daily-shop/:itemId/buy',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: dailyShopItemIdParamSchema },
    },
    async (request) => {
      const result = await dailyShopDomain.buy(
        request.user.userID,
        request.params.itemId,
      )
      void fastify.iocContainer.activityDomain.record('SHOP_PURCHASE', {
        userId: request.user.userID,
        payload: { dailyShop: true, itemId: request.params.itemId },
      })
      return {
        ...result,
        card: { ...result.card, imageUrl: resolveUrl(result.card.imageUrl) },
      }
    },
  )
}

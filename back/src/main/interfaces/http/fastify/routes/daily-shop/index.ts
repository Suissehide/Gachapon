import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import type { DailyShopItemResult } from '../../../../../types/domain/daily-shop/daily-shop.domain.interface'
import { dailyShopItemIdParamSchema } from '../../schemas/daily-shop.schema'

export const dailyShopRouter: FastifyPluginCallbackZod = (fastify) => {
  const { dailyShopDomain, storageClient } = fastify.iocContainer

  const resolveUrl = (key: string | null) =>
    key ? storageClient.publicUrl(key) : null

  const resolveItem = (item: DailyShopItemResult) => ({
    ...item,
    card: { ...item.card, imageUrl: resolveUrl(item.card.imageUrl) },
  })

  fastify.get(
    '/daily-shop',
    { onRequest: [fastify.verifySessionCookie] },
    async (request) => {
      const result = await dailyShopDomain.getOrGenerate(request.user.userID)
      return {
        ...result,
        items: result.items.map(resolveItem),
      }
    },
  )

  fastify.post(
    '/daily-shop/:itemId/buy',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: dailyShopItemIdParamSchema },
    },
    async (request) => {
      const result = await dailyShopDomain.buy(request.user.userID, request.params.itemId)
      return {
        ...result,
        card: { ...result.card, imageUrl: resolveUrl(result.card.imageUrl) },
      }
    },
  )
}

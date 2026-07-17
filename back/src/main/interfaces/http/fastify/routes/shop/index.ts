import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { applyPercentDiscount } from '../../../../../domain/shared/discount'
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
      const startOfDayUtc = new Date()
      startOfDayUtc.setUTCHours(0, 0, 0, 0)
      const [items, activeBoosts, cfg, energyUsed, effects] = await Promise.all(
        [
          shopItemRepository.findActive(),
          userBoostRepository.findActiveByUser(userId),
          fastify.iocContainer.configService.getMany('shop.energyDailyCap'),
          fastify.iocContainer.postgresOrm.prisma.purchase.count({
            where: {
              userId,
              purchasedAt: { gte: startOfDayUtc },
              shopItem: { type: 'ENERGY_PACK' },
            },
          }),
          fastify.iocContainer.skillTreeRepository.getEffectsForUser(userId),
        ],
      )
      return {
        energyDaily: { cap: cfg['shop.energyDailyCap'], used: energyUsed },
        items: items.map((item) => {
          let activeBoost: { pullsRemaining: number } | null = null
          if (item.type === 'BOOST') {
            const boostValue = item.value as {
              multiplier?: number
              rarity?: string
              guaranteedRarity?: string
            }
            const isWeightBoost = boostValue.multiplier != null
            const matchingBoost = isWeightBoost
              ? activeBoosts.find(
                  (b) =>
                    b.weightMultiplier != null &&
                    b.weightRarity === boostValue.rarity,
                )
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
            cost:
              item.currency === 'GOLD'
                ? applyPercentDiscount(item.cost, effects.goldShopDiscount)
                : item.cost,
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

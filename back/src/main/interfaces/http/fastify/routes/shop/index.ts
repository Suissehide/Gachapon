import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

export const shopRouter: FastifyPluginCallbackZod = (fastify) => {
  const { postgresOrm } = fastify.iocContainer
  const prisma = postgresOrm.prisma

  // GET /shop — liste des articles actifs
  fastify.get(
    '/shop',
    { onRequest: [fastify.verifySessionCookie] },
    async () => {
      const items = await prisma.shopItem.findMany({
        where: { isActive: true },
        orderBy: [{ type: 'asc' }, { dustCost: 'asc' }],
      })
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

  // POST /shop/:id/buy — acheter un article
  fastify.post(
    '/shop/:id/buy',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: z.object({ id: z.string().uuid() }) },
    },
    async (request) => {
      const userId = request.user.userID
      const { id: shopItemId } = request.params

      const item = await prisma.shopItem.findUnique({
        where: { id: shopItemId },
      })
      if (!item || !item.isActive) {
        throw Boom.notFound('Item not found')
      }

      const result = await postgresOrm.executeWithTransactionClient(
        async (tx) => {
          const user = await tx.user.findUniqueOrThrow({
            where: { id: userId },
          })
          if (user.dust < item.dustCost) {
            throw Boom.paymentRequired('Not enough dust')
          }

          const purchase = await tx.purchase.create({
            data: { userId, shopItemId, dustSpent: item.dustCost },
          })

          const updated = await tx.user.update({
            where: { id: userId },
            data: { dust: { decrement: item.dustCost } },
          })

          return { purchase, newDustTotal: updated.dust }
        },
        { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 },
      )

      return {
        purchaseId: result.purchase.id,
        dustSpent: item.dustCost,
        newDustTotal: result.newDustTotal,
        item: {
          id: item.id,
          name: item.name,
          type: item.type,
          value: item.value,
        },
      }
    },
  )
}

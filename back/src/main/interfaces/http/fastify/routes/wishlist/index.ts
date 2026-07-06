import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { setWishBodySchema } from '../../schemas/wishlist.schema'

export const wishlistRouter: FastifyPluginCallbackZod = (fastify) => {
  const { wishlistDomain, storageClient } = fastify.iocContainer

  const resolveUrl = (key: string | null) =>
    key ? storageClient.publicUrl(key) : null

  fastify.get(
    '/wishlist',
    { onRequest: [fastify.verifySessionCookie] },
    async (request) => {
      const status = await wishlistDomain.getStatus(request.user.userID)
      return {
        ...status,
        card: status.card
          ? { ...status.card, imageUrl: resolveUrl(status.card.imageUrl) }
          : null,
      }
    },
  )

  fastify.put(
    '/wishlist',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { body: setWishBodySchema },
    },
    async (request, reply) => {
      await wishlistDomain.setWish(request.user.userID, request.body.cardId)
      return reply.code(204).send()
    },
  )

  fastify.post(
    '/wishlist/purchase',
    { onRequest: [fastify.verifySessionCookie] },
    async (request) => {
      const result = await wishlistDomain.purchase(request.user.userID)
      return {
        ...result,
        card: { ...result.card, imageUrl: resolveUrl(result.card.imageUrl) },
      }
    },
  )
}

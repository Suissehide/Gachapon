import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import {
  wishlistCardParamsSchema,
  wishlistPurchaseResponseSchema,
  wishlistStatusResponseSchema,
} from '../../schemas/wishlist.schema'

export const wishlistRouter: FastifyPluginCallbackZod = (fastify) => {
  const { wishlistDomain, storageClient } = fastify.iocContainer

  const resolveUrl = (key: string | null) =>
    key ? storageClient.publicUrl(key) : null

  fastify.get(
    '/wishlist',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        summary: 'Get my wishlist',
        response: { 200: wishlistStatusResponseSchema },
      },
    },
    async (request) => {
      const status = await wishlistDomain.getStatus(request.user.userID)
      return {
        ...status,
        cards: status.cards.map((card) => ({
          ...card,
          imageUrl: resolveUrl(card.imageUrl),
        })),
      }
    },
  )

  fastify.put(
    '/wishlist/:cardId',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        summary: 'Add a card to my wishlist',
        params: wishlistCardParamsSchema,
      },
    },
    async (request, reply) => {
      await wishlistDomain.addWish(request.user.userID, request.params.cardId)
      return reply.code(204).send()
    },
  )

  fastify.delete(
    '/wishlist/:cardId',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        summary: 'Remove a card from my wishlist',
        params: wishlistCardParamsSchema,
      },
    },
    async (request, reply) => {
      await wishlistDomain.removeWish(
        request.user.userID,
        request.params.cardId,
      )
      return reply.code(204).send()
    },
  )

  fastify.post(
    '/wishlist/:cardId/purchase',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        summary: 'Buy a wishlisted card',
        params: wishlistCardParamsSchema,
        response: { 200: wishlistPurchaseResponseSchema },
      },
    },
    async (request) => {
      const result = await wishlistDomain.purchase(
        request.user.userID,
        request.params.cardId,
      )
      return {
        ...result,
        card: { ...result.card, imageUrl: resolveUrl(result.card.imageUrl) },
      }
    },
  )
}

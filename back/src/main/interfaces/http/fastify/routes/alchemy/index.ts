import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { transmuteBodySchema } from '../../schemas/alchemy.schema'

// Fonctionnalité solo : PAS de forbidGuest (spec 2026-10-03).
export const alchemyRouter: FastifyPluginCallbackZod = (fastify) => {
  const { alchemyDomain, storageClient } = fastify.iocContainer
  const resolveUrl = (key: string | null) =>
    key ? storageClient.publicUrl(key) : null

  fastify.get(
    '/alchemy',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { summary: 'Get the alchemy tiers and transmutable duplicates' },
    },
    async (request) => {
      const board = await alchemyDomain.board(request.user.userID)
      return {
        tiers: board.tiers.map((t) => ({
          ...t,
          candidates: t.candidates.map((c) => ({
            ...c,
            imageUrl: resolveUrl(c.imageUrl),
          })),
        })),
      }
    },
  )

  fastify.post(
    '/alchemy/transmute',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        summary: 'Transmute duplicates into a card of the next rarity',
        body: transmuteBodySchema,
      },
    },
    async (request) => {
      const result = await alchemyDomain.transmute(
        request.user.userID,
        request.body.fromRarity,
        request.body.picks,
      )
      return {
        ...result,
        card: { ...result.card, imageUrl: resolveUrl(result.card.imageUrl) },
      }
    },
  )
}

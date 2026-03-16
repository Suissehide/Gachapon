import Boom from '@hapi/boom'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import type { CardRarity } from '../../../../../types/domain/gacha/gacha.types'
import { DUST_BY_RARITY } from '../../../../../types/domain/gacha/gacha.types'

// biome-ignore lint/suspicious/useAwait: fastify plugin pattern
export const collectionRouter: FastifyPluginAsyncZod = async (fastify) => {
  const { cardRepository, userCardRepository, userRepository } = fastify.iocContainer

  // GET /sets — liste les sets (actifs)
  fastify.get(
    '/sets',
    { onRequest: [fastify.verifySessionCookie] },
    async () => {
      const sets = await cardRepository.findActiveSets()
      return { sets }
    },
  )

  // GET /cards — liste toutes les cartes (filtrables)
  fastify.get(
    '/cards',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        querystring: z.object({
          setId: z.string().optional(),
          rarity: z.string().optional(),
        }),
      },
    },
    async (request) => {
      const cards = await cardRepository.findAll({
        setId: request.query.setId,
        rarity: request.query.rarity as CardRarity | undefined,
      })
      return {
        cards: cards.map((c) => ({
          id: c.id,
          name: c.name,
          imageUrl: c.imageUrl,
          rarity: c.rarity,
          variant: c.variant,
          dropWeight: c.dropWeight,
          set: { id: c.set.id, name: c.set.name },
        })),
      }
    },
  )

  // GET /cards/:id — détail d'une carte
  fastify.get(
    '/cards/:id',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: z.object({ id: z.string().uuid() }) },
    },
    async (request) => {
      const card = await cardRepository.findById(request.params.id)
      if (!card) { throw Boom.notFound('Card not found') }
      return card
    },
  )

  // GET /users/:id/collection — collection d'un utilisateur
  fastify.get(
    '/users/:id/collection',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: z.object({ id: z.string().uuid() }) },
    },
    async (request) => {
      const user = await userRepository.findById(request.params.id)
      if (!user) { throw Boom.notFound('User not found') }

      const userCards = await userCardRepository.findByUser(request.params.id)
      return {
        cards: userCards.map((uc) => ({
          card: {
            id: uc.card.id,
            name: uc.card.name,
            imageUrl: uc.card.imageUrl,
            rarity: uc.card.rarity,
            variant: uc.card.variant,
            set: { id: uc.card.set.id, name: uc.card.set.name },
          },
          quantity: uc.quantity,
          obtainedAt: uc.obtainedAt.toISOString(),
        })),
      }
    },
  )

  // POST /collection/recycle — recycler une carte en dust
  fastify.post(
    '/collection/recycle',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { body: z.object({ cardId: z.string().uuid() }) },
    },
    async (request) => {
      const userId = request.user.userID
      const { cardId } = request.body

      const card = await cardRepository.findById(cardId)
      if (!card) { throw Boom.notFound('Card not found') }

      const userCard = await userCardRepository.findByUser(userId)
      const owned = userCard.find((uc) => uc.card.id === cardId)
      if (!owned || owned.quantity < 1) {
        throw Boom.badRequest('You do not own this card')
      }

      const dustEarned = DUST_BY_RARITY[card.rarity]
      await userCardRepository.decrementOrDelete(userId, cardId)

      // Incrémenter dust atomiquement
      const { postgresOrm } = fastify.iocContainer
      const user = await postgresOrm.prisma.user.update({
        where: { id: userId },
        data: { dust: { increment: dustEarned } },
      })

      return { dustEarned, newDustTotal: user.dust }
    },
  )
}

import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import type { CardRarity } from '../../../../../types/domain/gacha/gacha.types'
import type { ConfigKey } from '../../../../../types/infra/config/config.service.interface'

export const collectionRouter: FastifyPluginCallbackZod = (fastify) => {
  const { cardRepository, userCardRepository, userRepository, upgradeRepository } =
    fastify.iocContainer

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
      if (!card) {
        throw Boom.notFound('Card not found')
      }
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
      if (request.params.id !== request.user.userID) {
        throw Boom.forbidden("Cannot view another user's collection")
      }

      const user = await userRepository.findById(request.params.id)
      if (!user) {
        throw Boom.notFound('User not found')
      }

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
      schema: { body: z.object({ cardId: z.string().uuid(), quantity: z.number().int().min(1).default(1) }) },
    },
    async (request) => {
      const userId = request.user.userID
      const { cardId, quantity } = request.body

      const { postgresOrm, configService } = fastify.iocContainer

      // First verify card exists (outside tx is fine for read-only catalog data)
      const card = await cardRepository.findById(cardId)
      if (!card) {
        throw Boom.notFound('Card not found')
      }

      const dustKey = `dust${card.rarity.charAt(0) + card.rarity.slice(1).toLowerCase()}` as ConfigKey
      const baseDust = await configService.get(dustKey)

      const upgrades = await upgradeRepository.getEffectsForUser(userId)
      const dustEarned = Math.round(baseDust * upgrades.dustHarvestMultiplier * quantity)

      const result = await postgresOrm.executeWithTransactionClient(
        async (tx) => {
          // Re-read ownership inside the transaction to prevent TOCTOU
          const uc = await tx.userCard.findUnique({
            where: { userId_cardId: { userId, cardId } },
          })
          if (!uc || uc.quantity < quantity) {
            throw Boom.badRequest('You do not own this card')
          }

          // Decrement or delete
          if (uc.quantity - quantity <= 0) {
            await tx.userCard.delete({
              where: { userId_cardId: { userId, cardId } },
            })
          } else {
            await tx.userCard.update({
              where: { userId_cardId: { userId, cardId } },
              data: { quantity: { decrement: quantity } },
            })
          }

          // Increment dust atomically
          const user = await tx.user.update({
            where: { id: userId },
            data: { dust: { increment: dustEarned } },
          })

          return { dustEarned, newDustTotal: user.dust }
        },
        { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 },
      )

      return result
    },
  )
}

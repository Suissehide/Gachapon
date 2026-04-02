import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import type { CardRarity } from '../../../../../types/domain/gacha/gacha.types'
import {
  collectionCardIdParamSchema,
  collectionCardsQuerySchema,
  collectionRecycleBodySchema,
  collectionUserIdParamSchema,
} from '../../schemas/collection.schema'

export const collectionRouter: FastifyPluginCallbackZod = (fastify) => {
  const {
    cardRepository,
    userCardRepository,
    userRepository,
    collectionDomain,
  } = fastify.iocContainer

  fastify.get(
    '/sets',
    { onRequest: [fastify.verifySessionCookie] },
    async () => {
      const sets = await cardRepository.findActiveSets()
      return { sets }
    },
  )

  fastify.get(
    '/cards',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { querystring: collectionCardsQuerySchema },
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
          set: { id: c.set.id, name: c.set.name },
        })),
      }
    },
  )

  fastify.get(
    '/cards/:id',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: collectionCardIdParamSchema },
    },
    async (request) => {
      const card = await cardRepository.findById(request.params.id)
      if (!card) {
        throw Boom.notFound('Card not found')
      }
      return card
    },
  )

  fastify.get(
    '/users/:id/collection',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { params: collectionUserIdParamSchema },
    },
    async (request) => {
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
            set: { id: uc.card.set.id, name: uc.card.set.name },
          },
          variant: uc.variant,
          quantity: uc.quantity,
          obtainedAt: uc.obtainedAt.toISOString(),
        })),
      }
    },
  )

  fastify.post(
    '/collection/recycle',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { body: collectionRecycleBodySchema },
    },
    (request) => {
      return collectionDomain.recycleCard(request.user.userID, request.body)
    },
  )
}

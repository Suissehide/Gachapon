import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import {
  cardAscendParamsSchema,
  cardAscendResponseSchema,
  cardDustConvertBodySchema,
  cardDustConvertParamsSchema,
  cardDustConvertResponseSchema,
  cardLevelUpBodySchema,
  cardLevelUpParamsSchema,
  cardLevelUpResponseSchema,
} from '../../schemas/cards.schema'

export const cardsRouter: FastifyPluginCallbackZod = (fastify) => {
  const { cardDustConversionDomain, cardLevelingTx, cardAscensionTx } =
    fastify.iocContainer

  fastify.post(
    '/cards/:userCardId/dust',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        summary: 'Convert duplicate copies of a card into dust',
        params: cardDustConvertParamsSchema,
        body: cardDustConvertBodySchema,
        response: { 200: cardDustConvertResponseSchema },
      },
    },
    (request) => {
      const { userCardId } = request.params
      const { amount } = request.body
      return cardDustConversionDomain.convert(
        request.user.userID,
        userCardId,
        amount,
      )
    },
  )

  fastify.post(
    '/cards/:userCardId/level-up',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        summary: 'Level up an owned card',
        params: cardLevelUpParamsSchema,
        body: cardLevelUpBodySchema,
        response: { 200: cardLevelUpResponseSchema },
      },
    },
    (request) => {
      const { userCardId } = request.params
      const { targetLevel } = request.body
      return cardLevelingTx.levelUp(
        request.user.userID,
        userCardId,
        targetLevel,
      )
    },
  )

  fastify.post(
    '/cards/:userCardId/ascend',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        summary: 'Ascend an owned card to the next tier',
        params: cardAscendParamsSchema,
        response: { 200: cardAscendResponseSchema },
      },
    },
    (request) => {
      const { userCardId } = request.params
      return cardAscensionTx.ascend(request.user.userID, userCardId)
    },
  )
}

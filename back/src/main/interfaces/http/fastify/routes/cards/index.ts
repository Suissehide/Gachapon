import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import {
  cardDustConvertBodySchema,
  cardDustConvertParamsSchema,
  cardDustConvertResponseSchema,
} from '../../schemas/cards.schema'

export const cardsRouter: FastifyPluginCallbackZod = (fastify) => {
  const { cardDustConversionDomain } = fastify.iocContainer

  fastify.post(
    '/cards/:userCardId/dust',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
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
}

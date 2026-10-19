import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { returnChestClaimResponseSchema } from '../../schemas/return-bonus.schema'

// Fonctionnalité solo : PAS de forbidGuest (spec 2026-10-19-bonus-de-retour).
export const returnBonusRouter: FastifyPluginCallbackZod = (fastify) => {
  const { returnBonusDomain } = fastify.iocContainer

  fastify.post(
    '/return-bonus/claim',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        summary: 'Claim the pending "welcome back" chest',
        response: { 200: returnChestClaimResponseSchema },
      },
    },
    async (request) => returnBonusDomain.claim(request.user.userID),
  )
}

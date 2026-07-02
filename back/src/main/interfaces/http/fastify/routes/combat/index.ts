import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import {
  combatDebugBattleBodySchema,
  combatDebugBattleResponseSchema,
  combatPointsResponseSchema,
  combatTeamPutBodySchema,
  combatTeamResponseSchema,
} from '../../schemas/combat.schema'

export const combatRouter: FastifyPluginCallbackZod = (fastify) => {
  const { combatTeamTx, combatDebugDomain, combatPointsTx, storageClient } =
    fastify.iocContainer

  // The team query returns raw image storage keys; front-end consumers expect
  // resolved public URLs (same as /collection and /gacha). Wrap once here.
  const withPublicImage = <T extends { cardImageUrl: string | null }>(
    unit: T,
  ): T => ({
    ...unit,
    cardImageUrl: unit.cardImageUrl
      ? storageClient.publicUrl(unit.cardImageUrl)
      : null,
  })

  fastify.get(
    '/combat/points',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { response: { 200: combatPointsResponseSchema } },
    },
    (request) => combatPointsTx.getView(request.user.userID),
  )

  fastify.get(
    '/combat/team',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { response: { 200: combatTeamResponseSchema } },
    },
    async (request) => {
      const { team } = await combatTeamTx.getTeam(request.user.userID)
      return { team: team.map(withPublicImage) }
    },
  )

  fastify.put(
    '/combat/team',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        body: combatTeamPutBodySchema,
        response: { 200: combatTeamResponseSchema },
      },
    },
    async (request) => {
      const { team } = await combatTeamTx.setTeam(
        request.user.userID,
        request.body.userCardIds,
      )
      return { team: team.map(withPublicImage) }
    },
  )

  fastify.post(
    '/combat/debug/battle',
    {
      onRequest: [
        fastify.verifySessionCookie,
        fastify.requireRole('SUPER_ADMIN'),
      ],
      schema: {
        body: combatDebugBattleBodySchema,
        response: { 200: combatDebugBattleResponseSchema },
      },
    },
    (request) => combatDebugDomain.run(request.body),
  )
}

import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import {
  combatDebugBattleBodySchema,
  combatDebugBattleResponseSchema,
  combatPointsResponseSchema,
  combatTeamKeyParamSchema,
  combatTeamPutBodySchema,
  combatTeamResponseSchema,
  combatTeamsResponseSchema,
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
      schema: {
        summary: 'Get combat energy points',
        response: { 200: combatPointsResponseSchema },
      },
    },
    (request) => combatPointsTx.getView(request.user.userID),
  )

  fastify.get(
    '/combat/teams',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        summary: 'List all saved combat teams',
        response: { 200: combatTeamsResponseSchema },
      },
    },
    async (request) => {
      const all = await combatTeamTx.getAllResolved(request.user.userID)
      return {
        teams: Object.fromEntries(
          Object.entries(all).map(([key, value]) => [
            key,
            { ...value, team: value.team.map(withPublicImage) },
          ]),
        ),
      }
    },
  )

  fastify.get(
    '/combat/teams/:key',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        summary: 'Get the combat team for a mode',
        params: combatTeamKeyParamSchema,
        response: { 200: combatTeamResponseSchema },
      },
    },
    async (request) => {
      const { team, inherited } = await combatTeamTx.getResolved(
        request.user.userID,
        request.params.key,
      )
      return { team: team.map(withPublicImage), inherited }
    },
  )

  fastify.put(
    '/combat/teams/:key',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        summary: 'Save the combat team for a mode',
        params: combatTeamKeyParamSchema,
        body: combatTeamPutBodySchema,
        response: { 200: combatTeamResponseSchema },
      },
    },
    async (request) => {
      const { team, inherited } = await combatTeamTx.setForKey(
        request.user.userID,
        request.params.key,
        request.body.userCardIds,
      )
      return { team: team.map(withPublicImage), inherited }
    },
  )

  fastify.delete(
    '/combat/teams/:key',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        summary: 'Clear the combat team for a mode',
        params: combatTeamKeyParamSchema,
        response: { 204: z.null() },
      },
    },
    async (request, reply) => {
      await combatTeamTx.clearForKey(request.user.userID, request.params.key)
      return reply.code(204).send(null)
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
        hide: true,
        body: combatDebugBattleBodySchema,
        response: { 200: combatDebugBattleResponseSchema },
      },
    },
    (request) => combatDebugDomain.run(request.body),
  )
}

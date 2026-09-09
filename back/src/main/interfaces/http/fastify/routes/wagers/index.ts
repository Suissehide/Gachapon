import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import {
  duelParamSchema,
  duelViewSchema,
  proposeDuelBodySchema,
  wagersTeamParamSchema,
  wagersViewResponseSchema,
} from '../../schemas/wagers.schema'

export const wagersRouter: FastifyPluginCallbackZod = (fastify) => {
  const { duelDomain } = fastify.iocContainer

  fastify.get(
    '/teams/:id/wagers',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        tags: ['Wagers'],
        params: wagersTeamParamSchema,
        response: { 200: wagersViewResponseSchema },
      },
    },
    (request) =>
      duelDomain.listForTeam(request.params.id, request.user.userID),
  )

  fastify.post(
    '/teams/:id/duels',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        tags: ['Wagers'],
        params: wagersTeamParamSchema,
        body: proposeDuelBodySchema,
        response: { 201: duelViewSchema },
      },
    },
    async (request, reply) => {
      const duel = await duelDomain.propose(
        request.params.id,
        request.user.userID,
        request.body.opponentId,
      )
      return reply.status(201).send(duel)
    },
  )

  fastify.post(
    '/teams/:id/duels/:duelId/accept',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        tags: ['Wagers'],
        params: duelParamSchema,
        response: { 200: duelViewSchema },
      },
    },
    (request) =>
      duelDomain.accept(
        request.params.id,
        request.params.duelId,
        request.user.userID,
      ),
  )

  fastify.post(
    '/teams/:id/duels/:duelId/decline',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        tags: ['Wagers'],
        params: duelParamSchema,
        response: { 200: duelViewSchema },
      },
    },
    (request) =>
      duelDomain.decline(
        request.params.id,
        request.params.duelId,
        request.user.userID,
      ),
  )

  fastify.post(
    '/teams/:id/duels/:duelId/cancel',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        tags: ['Wagers'],
        params: duelParamSchema,
        response: { 200: duelViewSchema },
      },
    },
    (request) =>
      duelDomain.cancel(
        request.params.id,
        request.params.duelId,
        request.user.userID,
      ),
  )
}

import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import {
  betQuoteQuerySchema,
  betQuoteResponseSchema,
  betViewSchema,
  duelParamSchema,
  duelViewSchema,
  placeBetBodySchema,
  proposeDuelBodySchema,
  wagersTeamParamSchema,
  wagersViewResponseSchema,
} from '../../schemas/wagers.schema'

export const wagersRouter: FastifyPluginCallbackZod = (fastify) => {
  const { betDomain, duelDomain } = fastify.iocContainer

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

  fastify.get(
    '/teams/:id/bets/quote',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        tags: ['Wagers'],
        params: wagersTeamParamSchema,
        querystring: betQuoteQuerySchema,
        response: { 200: betQuoteResponseSchema },
      },
    },
    (request) =>
      betDomain.quote(
        request.params.id,
        request.user.userID,
        request.query.targetId,
        request.query.minRarity,
      ),
  )

  fastify.post(
    '/teams/:id/bets',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        tags: ['Wagers'],
        params: wagersTeamParamSchema,
        body: placeBetBodySchema,
        response: { 201: betViewSchema },
      },
    },
    async (request, reply) => {
      // `request.body` ne porte que la cible, la rareté et la mise : la cote
      // vient du domaine, jamais du client.
      const bet = await betDomain.place(
        request.params.id,
        request.user.userID,
        request.body.targetId,
        request.body.minRarity,
        request.body.stake,
      )
      return reply.status(201).send(bet)
    },
  )
}

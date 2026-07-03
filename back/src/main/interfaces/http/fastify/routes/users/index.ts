import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import {
  featuredCardsResponseSchema,
  setFeaturedCardsBodySchema,
  setFeaturedCardsResponseSchema,
  setsProgressionResponseSchema,
  userProfileResponseSchema,
  usersProfileParamSchema,
  usersSearchQuerySchema,
} from '../../schemas/users.schema'

export const usersRouter: FastifyPluginCallbackZod = (fastify) => {
  const {
    userRepository,
    gachaPullRepository,
    userCardRepository,
    profileDomain,
    storageClient,
  } = fastify.iocContainer

  const resolveUrl = (key: string | null) =>
    key ? storageClient.publicUrl(key) : null

  fastify.get(
    '/users/search',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: { querystring: usersSearchQuerySchema },
    },
    async (request) => {
      const users = await userRepository.searchByUsername(
        request.query.q,
        request.user.userID,
      )
      return { users }
    },
  )

  fastify.get(
    '/users/:username/profile',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        params: usersProfileParamSchema,
        response: { 200: userProfileResponseSchema },
      },
    },
    async (request) => {
      const user = await userRepository.findByUsername(request.params.username)
      if (!user) {
        throw Boom.notFound('User not found')
      }

      const [totalPulls, ownedCards, legendaryCount, dustGenerated] =
        await Promise.all([
          gachaPullRepository.countByUser(user.id),
          userCardRepository.countByUser(user.id),
          userCardRepository.countLegendaryByUser(user.id),
          gachaPullRepository.sumDustEarnedByUser(user.id),
        ])

      return {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        banner: user.banner,
        level: user.level,
        xp: user.xp,
        dust: user.dust,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        stats: { totalPulls, ownedCards, legendaryCount, dustGenerated },
        streakDays: user.streakDays,
        bestStreak: user.bestStreak,
      }
    },
  )

  fastify.get(
    '/users/:username/profile/featured-cards',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        params: usersProfileParamSchema,
        response: { 200: featuredCardsResponseSchema },
      },
    },
    async (request) => {
      const cards = await profileDomain.getFeaturedCards(
        request.params.username,
      )
      return {
        cards: cards.map((c) => ({ ...c, imageUrl: resolveUrl(c.imageUrl) })),
      }
    },
  )

  fastify.get(
    '/users/:username/profile/sets-progression',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        params: usersProfileParamSchema,
        response: { 200: setsProgressionResponseSchema },
      },
    },
    async (request) => {
      const sets = await profileDomain.getSetsProgression(
        request.params.username,
      )
      return { sets }
    },
  )

  fastify.put(
    '/users/me/featured-cards',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        body: setFeaturedCardsBodySchema,
        response: { 200: setFeaturedCardsResponseSchema },
      },
    },
    async (request) => {
      const cardIds = await profileDomain.setFeaturedCards(
        request.user.userID,
        request.body.cardIds,
      )
      return { cardIds }
    },
  )
}

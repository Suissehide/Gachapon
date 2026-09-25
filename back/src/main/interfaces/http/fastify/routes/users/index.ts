import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { errorMessage } from '../../../../../infra/i18n/error-messages'
import {
  featuredCardsResponseSchema,
  setFeaturedCardsBodySchema,
  setFeaturedCardsResponseSchema,
  setsProgressionResponseSchema,
  updateLocaleBodySchema,
  updateLocaleResponseSchema,
  updateUsernameBodySchema,
  updateUsernameResponseSchema,
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
    userDomain,
  } = fastify.iocContainer

  const resolveUrl = (key: string | null) =>
    key ? storageClient.publicUrl(key) : null

  fastify.get(
    '/users/search',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        summary: 'Search users by username',
        querystring: usersSearchQuerySchema,
      },
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
        summary: "Get a user's public profile",
        params: usersProfileParamSchema,
        response: { 200: userProfileResponseSchema },
      },
    },
    async (request) => {
      const user = await userRepository.findByUsername(request.params.username)
      if (!user) {
        throw Boom.notFound(errorMessage('user.notFound'))
      }

      const [totalPulls, ownedCards, legendaryCount] = await Promise.all([
        gachaPullRepository.countByUser(user.id),
        userCardRepository.countByUser(user.id),
        userCardRepository.countLegendaryByUser(user.id),
      ])
      const dustGenerated = user.dustGenerated

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
        summary: "Get a user's featured cards",
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
        summary: "Get a user's set completion progress",
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
        summary: 'Set my featured profile cards',
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

  fastify.patch(
    '/users/me/username',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        summary: 'Change my username',
        body: updateUsernameBodySchema,
        response: { 200: updateUsernameResponseSchema },
      },
    },
    async (request) => {
      const user = await userDomain.updateUsername(
        request.user.userID,
        request.body.username,
      )
      return { username: user.username }
    },
  )

  fastify.patch(
    '/users/me/locale',
    {
      onRequest: [fastify.verifySessionCookie],
      schema: {
        summary: 'Change my preferred language',
        body: updateLocaleBodySchema,
        response: { 200: updateLocaleResponseSchema },
      },
    },
    async (request) => {
      const user = await userDomain.updateLocale(
        request.user.userID,
        request.body.locale,
      )
      return { locale: user.locale }
    },
  )
}

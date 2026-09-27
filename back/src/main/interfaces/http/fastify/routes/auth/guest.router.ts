import Boom from '@hapi/boom'
import type { FastifyRequest } from 'fastify'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { rateLimitKeyForIp } from '../../../../../domain/auth/guest-rules'
import { errorMessage } from '../../../../../infra/i18n/error-messages'
import { userResponseSchema } from '../../schemas/auth.schemas'
import { sanitizeUser, setTokenCookies } from './helpers'

const DAY_MS = 24 * 60 * 60 * 1000

export const guestRouter: FastifyPluginCallbackZod = (fastify) => {
  const { guestDomain, jwtService, userRewardRepository } = fastify.iocContainer

  /** Vrai si la requête porte déjà une session valide (access OU refresh). */
  const hasSession = (request: FastifyRequest): boolean => {
    const { access_token: access, refresh_token: refresh } = request.cookies
    try {
      if (access) {
        jwtService.verify(access)
        return true
      }
    } catch {
      /* access expiré : on regarde le refresh */
    }
    try {
      if (refresh) {
        jwtService.verifyRefresh(refresh)
        return true
      }
    } catch {
      /* rien de valide */
    }
    return false
  }

  fastify.post(
    '/',
    {
      config: {
        rateLimit: {
          max: 3,
          timeWindow: DAY_MS,
          keyGenerator: (request) => `guest:${rateLimitKeyForIp(request.ip)}`,
        },
      },
      schema: {
        summary: 'Start playing as a guest (no email)',
        response: { 201: userResponseSchema },
      },
    },
    async (request, reply) => {
      if (hasSession(request)) {
        throw Boom.conflict(errorMessage('auth.alreadyAuthenticated'))
      }
      const { user, tokens, unlockedAchievements } =
        await guestDomain.createGuest()
      setTokenCookies(reply, tokens)
      const pendingRewardsCount = await userRewardRepository.countPendingByUser(
        user.id,
      )
      return reply.status(201).send({
        ...sanitizeUser(user),
        pendingRewardsCount,
        unlockedAchievements,
      })
    },
  )
}

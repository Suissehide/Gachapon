import Boom from '@hapi/boom'
import type { FastifyRequest } from 'fastify'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { rateLimitKeyForIp } from '../../../../../domain/auth/guest-rules'
import { errorMessage } from '../../../../../infra/i18n/error-messages'
import type { JwtPayload } from '../../../../../types/domain/auth/auth.types'
import {
  guestUpgradeBodySchema,
  guestUpgradeResponseSchema,
  userResponseSchema,
} from '../../schemas/auth.schemas'
import { sanitizeUser, setTokenCookies } from './helpers'

const DAY_MS = 24 * 60 * 60 * 1000

export const guestRouter: FastifyPluginCallbackZod = (fastify) => {
  const {
    guestDomain,
    jwtService,
    userRewardRepository,
    userRepository,
    refreshTokenRepository,
  } = fastify.iocContainer

  /**
   * Vrai si la requête porte déjà une session UTILISABLE (access OU
   * refresh). Une signature valide ne suffit pas : l'utilisateur a pu être
   * supprimé (purge d'invité) ou le refresh révoqué — le front traiterait
   * alors le 409 comme un succès, `fetchMe` échouerait et « Jouer » ne
   * mènerait nulle part.
   */
  const hasSession = async (request: FastifyRequest): Promise<boolean> => {
    const { access_token: access, refresh_token: refresh } = request.cookies
    try {
      if (access) {
        const { sub } = jwtService.verify<JwtPayload>(access)
        if (await userRepository.findById(sub)) {
          return true
        }
      }
    } catch {
      /* access expiré : on regarde le refresh */
    }
    try {
      if (refresh) {
        const { sub } = jwtService.verifyRefresh<JwtPayload>(refresh)
        if (
          (await refreshTokenRepository.exists(sub, refresh)) &&
          (await userRepository.findById(sub))
        ) {
          return true
        }
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
      if (await hasSession(request)) {
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

  fastify.post(
    '/upgrade',
    {
      onRequest: [fastify.verifySessionCookie],
      config: { rateLimit: { max: 5, timeWindow: 15 * 60 * 1000 } },
      schema: {
        summary: 'Ask to turn the guest account into a full account',
        body: guestUpgradeBodySchema,
        response: { 202: guestUpgradeResponseSchema },
      },
    },
    async (request, reply) => {
      const result = await guestDomain.requestEmailUpgrade(
        request.user.userID,
        request.body,
      )
      return reply.status(202).send(result)
    },
  )
}

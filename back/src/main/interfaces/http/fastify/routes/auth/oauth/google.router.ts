import { randomBytes } from 'node:crypto'
import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { errorMessage } from '../../../../../../infra/i18n/error-messages'
import {
  oauthAuthorizeQuerySchema,
  oauthCallbackQuerySchema,
} from '../../../schemas/auth.schemas'
import { completeOAuthCallback } from '../helpers'

export const googleOAuthRouter: FastifyPluginCallbackZod = (fastify) => {
  const { oauthDomain, config } = fastify.iocContainer

  fastify.get(
    '/authorize',
    {
      schema: {
        summary: 'Start Google OAuth sign-in',
        querystring: oauthAuthorizeQuerySchema,
      },
    },
    async (request, reply) => {
      const state = randomBytes(16).toString('hex')
      reply.setCookie('oauth_state', state, {
        httpOnly: true,
        secure: true,
        maxAge: 600,
        path: '/',
        sameSite: 'lax',
      })
      if (request.query.mode === 'link') {
        // Lie la popup OAuth à l'invité connecté. Cookie SIGNÉ : un tiers ne
        // peut pas y écrire l'id d'un autre invité.
        await fastify.verifySessionCookie(request)
        if (request.user.role !== 'GUEST') {
          throw Boom.forbidden(errorMessage('auth.guestOnly'))
        }
        reply.setCookie('oauth_link', request.user.userID, {
          httpOnly: true,
          secure: true,
          signed: true,
          maxAge: 600,
          path: '/',
          sameSite: 'lax',
        })
      }
      return reply.redirect(
        oauthDomain.getAuthorizationUrl('google', state, request.query.mode),
      )
    },
  )

  fastify.get(
    '/callback',
    {
      schema: { hide: true, querystring: oauthCallbackQuerySchema },
    },
    (request, reply) => {
      const { code, state } = request.query
      if (
        !request.cookies.oauth_state ||
        request.cookies.oauth_state !== state
      ) {
        throw Boom.forbidden(errorMessage('auth.oauthInvalidState'))
      }
      return completeOAuthCallback(
        oauthDomain,
        'google',
        code,
        request,
        reply,
        config.frontUrl,
      )
    },
  )
}

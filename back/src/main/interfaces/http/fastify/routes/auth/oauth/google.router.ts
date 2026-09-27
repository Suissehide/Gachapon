import { randomBytes } from 'node:crypto'
import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { encodeLinkCookie } from '../../../../../../domain/auth/oauth-link-cookie'
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
        // Lie la popup OAuth à l'invité connecté. Cookie SIGNÉ, et lié au
        // `state` de CE round-trip (voir `oauth-link-cookie.ts`) : sans ce
        // lien, un flux abandonné puis une connexion normale ultérieure
        // (même fenêtre de 10 min, même navigateur) rattacherait le compte
        // OAuth de la connexion à l'invité au lieu de simplement le
        // connecter.
        await fastify.verifySessionCookie(request)
        if (request.user.role !== 'GUEST') {
          throw Boom.forbidden(errorMessage('auth.guestOnly'))
        }
        reply.setCookie(
          'oauth_link',
          encodeLinkCookie(request.user.userID, state),
          {
            httpOnly: true,
            secure: true,
            signed: true,
            maxAge: 600,
            path: '/',
            sameSite: 'lax',
          },
        )
      } else {
        // Un cookie de liaison orphelin (flux `link` abandonné dans les 10
        // dernières minutes) ne doit jamais survivre à une connexion ou
        // inscription normale lancée dans la même fenêtre de navigateur.
        reply.clearCookie('oauth_link', { path: '/' })
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
        state,
        request,
        reply,
        config.frontUrl,
      )
    },
  )
}

import { randomBytes } from 'node:crypto'
import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { errorMessage } from '../../../../../../infra/i18n/error-messages'
import {
  discordOAuthCallbackQuerySchema,
  oauthAuthorizeQuerySchema,
} from '../../../schemas/auth.schemas'
import { completeOAuthCallback } from '../helpers'

export const discordOAuthRouter: FastifyPluginCallbackZod = (fastify) => {
  const { oauthDomain, config } = fastify.iocContainer

  fastify.get(
    '/authorize',
    {
      schema: {
        summary: 'Start Discord OAuth sign-in',
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
        oauthDomain.getAuthorizationUrl('discord', state, request.query.mode),
      )
    },
  )

  fastify.get(
    '/callback',
    {
      schema: { hide: true, querystring: discordOAuthCallbackQuerySchema },
    },
    (request, reply) => {
      const { code, state, error } = request.query

      // Discord returns error=access_denied when prompt=none but user hasn't authorized yet.
      // Fall back to the full consent flow.
      if (error) {
        reply.clearCookie('oauth_state', { path: '/' })
        const fallbackState = randomBytes(16).toString('hex')
        reply.setCookie('oauth_state', fallbackState, {
          httpOnly: true,
          secure: true,
          maxAge: 600,
          path: '/',
          sameSite: 'lax',
        })
        const consentUrl = `https://discord.com/api/oauth2/authorize?${new URLSearchParams(
          {
            client_id: config.discordClientId,
            redirect_uri: config.discordRedirectUri,
            response_type: 'code',
            scope: 'identify email',
            state: fallbackState,
            prompt: 'consent',
          },
        )}`
        return reply.redirect(consentUrl)
      }

      if (!code || !state) {
        throw Boom.badRequest(errorMessage('auth.oauthMissingCodeOrState'))
      }
      if (
        !request.cookies.oauth_state ||
        request.cookies.oauth_state !== state
      ) {
        throw Boom.forbidden(errorMessage('auth.oauthInvalidState'))
      }
      return completeOAuthCallback(
        oauthDomain,
        'discord',
        code,
        request,
        reply,
        config.frontUrl,
      )
    },
  )
}

import { randomBytes } from 'node:crypto'
import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import {
  decodeLinkCookie,
  encodeLinkCookie,
} from '../../../../../../domain/auth/oauth-link-cookie'
import { errorMessage } from '../../../../../../infra/i18n/error-messages'
import {
  discordOAuthCallbackQuerySchema,
  oauthAuthorizeQuerySchema,
} from '../../../schemas/auth.schemas'
import { completeOAuthCallback } from '../helpers'

const LINK_COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  signed: true,
  maxAge: 600,
  path: '/',
  sameSite: 'lax' as const,
}

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
          LINK_COOKIE_OPTS,
        )
      } else {
        // Un cookie de liaison orphelin (flux `link` abandonné dans les 10
        // dernières minutes) ne doit jamais survivre à une connexion ou
        // inscription normale lancée dans la même fenêtre de navigateur.
        reply.clearCookie('oauth_link', { path: '/' })
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
        // Un flux `link` en cours survit à ce repli : on reporte la liaison
        // sur le nouveau `state` (même cookie signé, nouvelle valeur), sinon
        // le second aller-retour la perdrait silencieusement.
        const rawLink = request.cookies.oauth_link
        const decoded = decodeLinkCookie(
          rawLink ? request.unsignCookie(rawLink) : null,
        )
        if (decoded) {
          reply.setCookie(
            'oauth_link',
            encodeLinkCookie(decoded.userId, fallbackState),
            LINK_COOKIE_OPTS,
          )
        }
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
        state,
        request,
        reply,
        config.frontUrl,
      )
    },
  )
}

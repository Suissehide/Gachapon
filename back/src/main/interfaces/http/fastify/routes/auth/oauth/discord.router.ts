import { randomBytes } from 'node:crypto'
import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { setTokenCookies } from '../helpers'

export const discordOAuthRouter: FastifyPluginCallbackZod = (fastify) => {
  const { oauthDomain, config } = fastify.iocContainer

  fastify.get('/authorize', {}, (_request, reply) => {
    const state = randomBytes(16).toString('hex')
    reply.setCookie('oauth_state', state, {
      httpOnly: true,
      secure: true,
      maxAge: 600,
      path: '/',
      sameSite: 'lax',
    })
    return reply.redirect(oauthDomain.getAuthorizationUrl('discord', state))
  })

  fastify.get(
    '/callback',
    {
      schema: {
        querystring: z.object({
          code: z.string().optional(),
          state: z.string().optional(),
          error: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
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
        throw Boom.badRequest('Missing code or state')
      }
      if (
        !request.cookies.oauth_state ||
        request.cookies.oauth_state !== state
      ) {
        throw Boom.forbidden('Invalid OAuth state')
      }
      const { tokens } = await oauthDomain.handleCallback('discord', code)
      setTokenCookies(reply, tokens)
      reply.clearCookie('oauth_state', { path: '/' })
      return reply.redirect(`${config.frontUrl}/play`)
    },
  )
}

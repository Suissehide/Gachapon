import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'
import { randomBytes } from 'node:crypto'
import Boom from '@hapi/boom'
import { setTokenCookies } from '../helpers.js'

export const googleOAuthRouter: FastifyPluginAsyncZod = async (fastify) => {
  const { oauthDomain, config } = fastify.iocContainer

  fastify.get('/authorize', {}, async (request, reply) => {
    const state = randomBytes(16).toString('hex')
    reply.setCookie('oauth_state', state, { httpOnly: true, maxAge: 600, path: '/', sameSite: 'lax' })
    return reply.redirect(oauthDomain.getAuthorizationUrl('google', state))
  })

  fastify.get('/callback', {
    schema: { querystring: z.object({ code: z.string(), state: z.string() }) },
  }, async (request, reply) => {
    const { code, state } = request.query
    if (!request.cookies.oauth_state || request.cookies.oauth_state !== state) {
      throw Boom.forbidden('Invalid OAuth state')
    }
    const { tokens } = await oauthDomain.handleCallback('google', code)
    setTokenCookies(reply, tokens)
    reply.clearCookie('oauth_state', { path: '/' })
    return reply.redirect(`${config.frontUrl}/play`)
  })
}

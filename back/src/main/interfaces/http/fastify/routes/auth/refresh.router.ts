import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import Boom from '@hapi/boom'
import { setTokenCookies } from './helpers.js'

export const refreshRouter: FastifyPluginAsyncZod = async (fastify) => {
  const { authDomain } = fastify.iocContainer

  fastify.post('/', {}, async (request, reply) => {
    const refreshToken = request.cookies.refresh_token
    if (!refreshToken) throw Boom.unauthorized('No refresh token')
    const tokens = await authDomain.refreshTokens(refreshToken)
    setTokenCookies(reply, tokens)
    return { ok: true }
  })
}

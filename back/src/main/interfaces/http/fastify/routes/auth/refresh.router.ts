import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { setTokenCookies } from './helpers'

export const refreshRouter: FastifyPluginCallbackZod = (fastify) => {
  const { authDomain } = fastify.iocContainer

  fastify.post('/', {}, async (request, reply) => {
    const refreshToken = request.cookies.refresh_token
    if (!refreshToken) {
      throw Boom.unauthorized('No refresh token')
    }
    const tokens = await authDomain.refreshTokens(refreshToken)
    setTokenCookies(reply, tokens)
    return { ok: true }
  })
}

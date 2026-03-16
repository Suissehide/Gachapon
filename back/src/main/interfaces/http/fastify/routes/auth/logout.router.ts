import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { COOKIE_OPTS } from './helpers'

export const logoutRouter: FastifyPluginCallbackZod = (fastify) => {
  const { authDomain } = fastify.iocContainer

  fastify.post(
    '/',
    {
      onRequest: [fastify.verifySessionCookie],
    },
    async (request, reply) => {
      const refreshToken = request.cookies.refresh_token
      if (!refreshToken) {
        throw Boom.badRequest('No refresh token')
      }
      await authDomain.logout(request.user.userID, refreshToken)
      reply
        .clearCookie('access_token', { ...COOKIE_OPTS })
        .clearCookie('refresh_token', { ...COOKIE_OPTS })
      return reply.status(204).send()
    },
  )
}

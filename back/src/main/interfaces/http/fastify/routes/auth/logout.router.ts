import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import Boom from '@hapi/boom'

export const logoutRouter: FastifyPluginAsyncZod = async (fastify) => {
  const { authDomain } = fastify.iocContainer

  fastify.post('/', {
    onRequest: [fastify.verifySessionCookie],
  }, async (request, reply) => {
    const refreshToken = request.cookies.refresh_token
    if (!refreshToken) throw Boom.badRequest('No refresh token')
    await authDomain.logout(request.user.userID, refreshToken)
    reply
      .clearCookie('access_token', { path: '/' })
      .clearCookie('refresh_token', { path: '/' })
    return reply.status(204).send()
  })
}

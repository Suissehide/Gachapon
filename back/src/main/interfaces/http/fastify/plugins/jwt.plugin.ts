import fp from 'fastify-plugin'
import Boom from '@hapi/boom'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    user: { userID: string; role: string }
  }
  interface FastifyInstance {
    verifySessionCookie: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

export const jwtPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.decorate('verifySessionCookie', async (request: FastifyRequest) => {
    const { jwtService } = fastify.iocContainer

    // JWT cookie only — X-API-Key support will be added in Task 9
    const token = request.cookies.access_token
    if (!token) throw Boom.unauthorized('No access token')
    const payload = jwtService.verify<{ sub: string; role: string }>(token)
    request.user = { userID: payload.sub, role: payload.role }
  })
})

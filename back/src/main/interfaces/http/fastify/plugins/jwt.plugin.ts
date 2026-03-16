import fp from 'fastify-plugin'
import Boom from '@hapi/boom'
import type { FastifyInstance, FastifyRequest } from 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    user: { userID: string; role: string }
  }
  interface FastifyInstance {
    verifySessionCookie: (request: FastifyRequest) => Promise<void>
  }
}

export const jwtPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.decorate('verifySessionCookie', async (request: FastifyRequest) => {
    const { jwtService, apiKeyRepository, userRepository } = fastify.iocContainer

    // X-API-Key takes priority
    const rawKey = request.headers['x-api-key']
    const apiKey = Array.isArray(rawKey) ? rawKey[0] : rawKey
    if (apiKey) {
      const keyRecord = await apiKeyRepository.findByKey(apiKey)
      if (!keyRecord) throw Boom.unauthorized('Invalid API key')
      const user = await userRepository.findById(keyRecord.userId)
      if (!user) throw Boom.unauthorized('User not found')
      request.user = { userID: user.id, role: user.role }
      void apiKeyRepository.updateLastUsed(keyRecord.id)
      return
    }

    // JWT cookie fallback
    const token = request.cookies.access_token
    if (!token) throw Boom.unauthorized('No access token')
    const payload = jwtService.verify<{ sub: string; role: string }>(token)
    request.user = { userID: payload.sub, role: payload.role }
  })
})

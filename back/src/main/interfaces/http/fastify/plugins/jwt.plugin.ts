import Boom from '@hapi/boom'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'

import type { GlobalRole } from '../../../../../generated/client'
import { errorMessage } from '../errors/messages'

declare module 'fastify' {
  interface FastifyRequest {
    user: { userID: string; role: GlobalRole }
  }
  interface FastifyInstance {
    verifySessionCookie: (request: FastifyRequest) => Promise<void>
  }
}

async function verifyApiKey(
  request: FastifyRequest,
  fastify: FastifyInstance,
  apiKey: string,
): Promise<boolean> {
  const { apiKeyRepository, userRepository } = fastify.iocContainer
  const keyRecord = await apiKeyRepository.findByKey(apiKey)
  if (!keyRecord) {
    throw Boom.unauthorized(errorMessage('auth.invalidApiKey'))
  }
  const user = await userRepository.findById(keyRecord.userId)
  if (!user) {
    throw Boom.unauthorized(errorMessage('user.notFound'))
  }
  if (user.suspended) {
    throw Boom.forbidden(errorMessage('auth.accountSuspended'))
  }
  request.user = { userID: user.id, role: user.role }
  void apiKeyRepository.updateLastUsed(keyRecord.id)
  return true
}

async function verifyJwtCookie(
  request: FastifyRequest,
  fastify: FastifyInstance,
): Promise<void> {
  const { jwtService, userRepository } = fastify.iocContainer
  const token = request.cookies.access_token
  if (!token) {
    throw Boom.unauthorized(errorMessage('auth.noAccessToken'))
  }
  const payload = jwtService.verify<{ sub: string; role: GlobalRole }>(token)
  const user = await userRepository.findById(payload.sub)
  if (!user) {
    throw Boom.unauthorized(errorMessage('user.notFound'))
  }
  if (user.suspended) {
    throw Boom.forbidden(errorMessage('auth.accountSuspended'))
  }
  request.user = { userID: user.id, role: user.role }
}

export const jwtPlugin = fp((fastify: FastifyInstance) => {
  fastify.decorate('verifySessionCookie', async (request: FastifyRequest) => {
    // X-API-Key takes priority
    const rawKey = request.headers['x-api-key']
    const apiKey = Array.isArray(rawKey) ? rawKey[0] : rawKey
    if (apiKey) {
      await verifyApiKey(request, fastify, apiKey)
      return
    }

    // JWT cookie fallback
    await verifyJwtCookie(request, fastify)
  })
})

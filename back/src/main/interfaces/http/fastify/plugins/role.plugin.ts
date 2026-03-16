// back/src/main/interfaces/http/fastify/plugins/role.plugin.ts
import Boom from '@hapi/boom'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'

import type { GlobalRole } from '../../../../../generated/client'

declare module 'fastify' {
  interface FastifyInstance {
    requireRole: (role: GlobalRole) => (request: FastifyRequest) => Promise<void>
  }
}

export const rolePlugin = fp((fastify: FastifyInstance) => {
  fastify.decorate(
    'requireRole',
    (role: GlobalRole) =>
      (request: FastifyRequest): Promise<void> => {
        if (!request.user) {
          return Promise.reject(Boom.unauthorized('Not authenticated'))
        }
        if (request.user.role !== role) {
          return Promise.reject(Boom.forbidden('Insufficient permissions'))
        }
        return Promise.resolve()
      },
  )
})

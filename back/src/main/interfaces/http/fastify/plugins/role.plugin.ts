// back/src/main/interfaces/http/fastify/plugins/role.plugin.ts
import Boom from '@hapi/boom'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'

import type { GlobalRole } from '../../../../../generated/client'
import { errorMessage } from '../../../../infra/i18n/error-messages'

declare module 'fastify' {
  interface FastifyInstance {
    requireRole: (
      role: GlobalRole,
    ) => (request: FastifyRequest) => Promise<void>
    forbidGuest: (request: FastifyRequest) => Promise<void>
  }
}

/**
 * 403 avec un `code` stable : le front s'en sert pour afficher l'invitation à
 * créer un compte plutôt qu'une erreur générique. Le normalizer Boom recopie
 * `output.payload` tel quel dans la réponse, `code` compris.
 */
export const guestForbidden = () => {
  const err = Boom.forbidden(errorMessage('auth.guestForbidden'))
  Object.assign(err.output.payload, { code: 'GUEST_FORBIDDEN' })
  return err
}

export const rolePlugin = fp((fastify: FastifyInstance) => {
  fastify.decorate(
    'requireRole',
    (role: GlobalRole) =>
      (request: FastifyRequest): Promise<void> => {
        if (!request.user) {
          return Promise.reject(
            Boom.unauthorized(errorMessage('auth.notAuthenticated')),
          )
        }
        if (request.user.role !== role) {
          return Promise.reject(
            Boom.forbidden(errorMessage('auth.insufficientPermissions')),
          )
        }
        return Promise.resolve()
      },
  )

  // À poser en `preHandler` sur un routeur : les hooks `onRequest` d'un
  // plugin passent AVANT le `onRequest: [verifySessionCookie]` des routes,
  // donc `request.user` n'y existe pas encore. Une route publique (sans
  // session) laisse `request.user` vide et passe.
  fastify.decorate(
    'forbidGuest',
    (request: FastifyRequest): Promise<void> =>
      request.user?.role === 'GUEST'
        ? Promise.reject(guestForbidden())
        : Promise.resolve(),
  )
})

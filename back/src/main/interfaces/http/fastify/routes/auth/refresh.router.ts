import Boom from '@hapi/boom'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { setTokenCookies } from './helpers'

export const refreshRouter: FastifyPluginCallbackZod = (fastify) => {
  const { authDomain } = fastify.iocContainer

  // Compteur par route (store.child) : le refresh silencieux ne doit pas être
  // starvé par le rate limit global quand le reste du trafic l'épuise, sinon
  // un 401 pendant la fenêtre bloquée déconnecterait un utilisateur valide.
  fastify.post(
    '/',
    { config: { rateLimit: { max: 30, timeWindow: 60 * 1000 } } },
    async (request, reply) => {
      const refreshToken = request.cookies.refresh_token
      if (!refreshToken) {
        throw Boom.unauthorized('No refresh token')
      }
      const tokens = await authDomain.refreshTokens(refreshToken)
      setTokenCookies(reply, tokens)
      return { ok: true }
    },
  )
}

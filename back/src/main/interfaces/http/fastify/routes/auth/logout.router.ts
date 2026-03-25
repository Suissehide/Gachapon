import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { COOKIE_OPTS } from './helpers'

export const logoutRouter: FastifyPluginCallbackZod = (fastify) => {
  const { authDomain, jwtService } = fastify.iocContainer

  fastify.post('/', async (request, reply) => {
    const refreshToken = request.cookies.refresh_token
    if (refreshToken) {
      try {
        const payload = jwtService.verifyRefresh<{ sub: string }>(refreshToken)
        await authDomain.logout(payload.sub, refreshToken)
      } catch {
        // Token invalide ou expiré — on nettoie quand même les cookies
      }
    }
    reply
      .clearCookie('access_token', { ...COOKIE_OPTS })
      .clearCookie('refresh_token', { ...COOKIE_OPTS })
    return reply.status(204).send()
  })
}

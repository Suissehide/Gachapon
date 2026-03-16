import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { sanitizeUser, setTokenCookies } from './helpers'
import { loginBodySchema, userResponseSchema } from './schemas'

export const loginRouter: FastifyPluginCallbackZod = (fastify) => {
  const { authDomain } = fastify.iocContainer

  fastify.post(
    '/',
    {
      schema: { body: loginBodySchema, response: { 200: userResponseSchema } },
    },
    async (request, reply) => {
      const { user, tokens } = await authDomain.login(request.body)
      setTokenCookies(reply, tokens)
      return sanitizeUser(user)
    },
  )
}

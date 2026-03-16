import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { sanitizeUser, setTokenCookies } from './helpers'
import { registerBodySchema, userResponseSchema } from './schemas'

export const registerRouter: FastifyPluginCallbackZod = (fastify) => {
  const { authDomain } = fastify.iocContainer

  fastify.post(
    '/',
    {
      schema: {
        body: registerBodySchema,
        response: { 201: userResponseSchema },
      },
    },
    async (request, reply) => {
      const { user, tokens } = await authDomain.register(request.body)
      setTokenCookies(reply, tokens)
      return reply.status(201).send(sanitizeUser(user))
    },
  )
}

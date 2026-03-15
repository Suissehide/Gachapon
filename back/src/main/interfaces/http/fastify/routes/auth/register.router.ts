import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { registerBodySchema, userResponseSchema } from './schemas.js'
import { setTokenCookies, sanitizeUser } from './helpers.js'

export const registerRouter: FastifyPluginAsyncZod = async (fastify) => {
  const { authDomain } = fastify.iocContainer

  fastify.post('/', {
    schema: { body: registerBodySchema, response: { 201: userResponseSchema } },
  }, async (request, reply) => {
    const { user, tokens } = await authDomain.register(request.body)
    setTokenCookies(reply, tokens)
    return reply.status(201).send(sanitizeUser(user))
  })
}

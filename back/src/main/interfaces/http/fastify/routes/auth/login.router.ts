import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { loginBodySchema, userResponseSchema } from './schemas.js'
import { setTokenCookies, sanitizeUser } from './helpers.js'

export const loginRouter: FastifyPluginAsyncZod = async (fastify) => {
  const { authDomain } = fastify.iocContainer

  fastify.post('/', {
    schema: { body: loginBodySchema, response: { 200: userResponseSchema } },
  }, async (request, reply) => {
    const { user, tokens } = await authDomain.login(request.body)
    setTokenCookies(reply, tokens)
    return sanitizeUser(user)
  })
}

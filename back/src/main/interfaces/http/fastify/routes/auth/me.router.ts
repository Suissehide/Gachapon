import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import Boom from '@hapi/boom'
import { userResponseSchema } from './schemas.js'
import { sanitizeUser } from './helpers.js'

export const meRouter: FastifyPluginAsyncZod = async (fastify) => {
  const { userDomain } = fastify.iocContainer

  fastify.get('/', {
    preHandler: [fastify.verifySessionCookie],
    schema: { response: { 200: userResponseSchema } },
  }, async (request) => {
    const user = await userDomain.findById(request.user.userID)
    if (!user) throw Boom.notFound('User not found')
    return sanitizeUser(user)
  })
}

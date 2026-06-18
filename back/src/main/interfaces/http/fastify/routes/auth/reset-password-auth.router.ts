import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { resetPasswordBodySchema } from '../../schemas/auth.schemas'

export const resetPasswordAuthRouter: FastifyPluginCallbackZod = (fastify) => {
  const { authDomain } = fastify.iocContainer

  fastify.post(
    '/',
    {
      config: { rateLimit: { max: 10, timeWindow: 15 * 60 * 1000 } },
      schema: { body: resetPasswordBodySchema },
    },
    async (request, reply) => {
      await authDomain.resetPassword(
        request.body.token,
        request.body.newPassword,
      )
      return reply.status(204).send()
    },
  )
}

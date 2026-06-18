import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { resendVerificationBodySchema } from '../../schemas/auth.schemas'

export const resendVerificationRouter: FastifyPluginCallbackZod = (fastify) => {
  const { authDomain } = fastify.iocContainer

  fastify.post(
    '/',
    {
      config: { rateLimit: { max: 5, timeWindow: 15 * 60 * 1000 } },
      schema: { body: resendVerificationBodySchema },
    },
    async (request, reply) => {
      await authDomain.resendVerification(request.body.email)
      return reply.status(204).send()
    },
  )
}

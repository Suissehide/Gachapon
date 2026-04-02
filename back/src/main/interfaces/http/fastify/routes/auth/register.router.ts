import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import { registerBodySchema } from './schemas'

export const registerRouter: FastifyPluginCallbackZod = (fastify) => {
  const { authDomain } = fastify.iocContainer

  fastify.post(
    '/',
    {
      config: { rateLimit: { max: 5, timeWindow: 15 * 60 * 1000 } },
      schema: {
        body: registerBodySchema,
        response: { 201: z.object({ message: z.string(), email: z.string() }) },
      },
    },
    async (request, reply) => {
      const { email } = await authDomain.register(request.body)
      return reply
        .status(201)
        .send({ message: 'VERIFICATION_EMAIL_SENT', email })
    },
  )
}

import { z } from 'zod/v4'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { registerBodySchema } from './schemas'

const registerResponseSchema = z.object({
  email: z.string(),
})

export const registerRouter: FastifyPluginCallbackZod = (fastify) => {
  const { authDomain } = fastify.iocContainer

  fastify.post(
    '/',
    {
      schema: {
        body: registerBodySchema,
        response: { 202: registerResponseSchema },
      },
    },
    async (request, reply) => {
      const result = await authDomain.register(request.body)
      return reply.status(202).send(result)
    },
  )
}

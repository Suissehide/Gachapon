import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

export const resetPasswordAuthRouter: FastifyPluginCallbackZod = (fastify) => {
  const { authDomain } = fastify.iocContainer

  fastify.post(
    '/',
    {
      config: { rateLimit: { max: 10, timeWindow: 15 * 60 * 1000 } },
      schema: {
        body: z.object({
          token: z.string().uuid(),
          newPassword: z.string().min(8).max(100),
        }),
      },
    },
    async (request, reply) => {
      await authDomain.resetPassword(request.body.token, request.body.newPassword)
      return reply.status(204).send()
    },
  )
}

import type { FastifyReply } from 'fastify'
import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { sanitizeUser, setTokenCookies } from './helpers'
import { loginBodySchema, userResponseSchema } from './schemas'

export const loginRouter: FastifyPluginCallbackZod = (fastify) => {
  const { authDomain, userRewardRepository } = fastify.iocContainer

  fastify.post(
    '/',
    {
      schema: {
        body: loginBodySchema,
        response: {
          200: userResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { user, tokens } = await authDomain.login(request.body)
        setTokenCookies(reply, tokens)
        const pendingRewardsCount =
          await userRewardRepository.countPendingByUser(user.id)
        return { ...sanitizeUser(user), pendingRewardsCount }
      } catch (err: unknown) {
        // Boom 403 with EMAIL_NOT_VERIFIED — expose email to client
        if (
          err !== null &&
          typeof err === 'object' &&
          'isBoom' in err &&
          'output' in err &&
          typeof (err as { output: unknown }).output === 'object' &&
          (err as { output: { statusCode: number } }).output !== null &&
          (err as { output: { statusCode: number } }).output.statusCode === 403
        ) {
          const rawReply = reply as unknown as FastifyReply
          return rawReply.status(403).send({
            message: 'Email non vérifié',
            code: 'EMAIL_NOT_VERIFIED',
            email: request.body.email,
          })
        }
        throw err
      }
    },
  )
}

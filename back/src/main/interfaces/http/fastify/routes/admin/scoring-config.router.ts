import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { adminScoringConfigBodySchema } from '../../schemas/admin-scoring-config.schemas'

export const adminScoringConfigRouter: FastifyPluginCallbackZod = (fastify) => {
  const { scoringConfigRepository } = fastify.iocContainer

  fastify.get('/', async () => {
    return await scoringConfigRepository.get()
  })

  fastify.put(
    '/',
    { schema: { body: adminScoringConfigBodySchema } },
    async (request) => {
      return await scoringConfigRepository.upsert(request.body)
    },
  )
}

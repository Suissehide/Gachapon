import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

const scoringConfigBodySchema = z.object({
  commonPoints: z.number().int().min(0),
  uncommonPoints: z.number().int().min(0),
  rarePoints: z.number().int().min(0),
  epicPoints: z.number().int().min(0),
  legendaryPoints: z.number().int().min(0),
  brilliantMultiplier: z.number().min(1.0),
  holographicMultiplier: z.number().min(1.0),
})

export const adminScoringConfigRouter: FastifyPluginCallbackZod = (fastify) => {
  const { scoringConfigRepository } = fastify.iocContainer

  fastify.get('/', async () => {
    return await scoringConfigRepository.get()
  })

  fastify.put(
    '/',
    { schema: { body: scoringConfigBodySchema } },
    async (request) => {
      return await scoringConfigRepository.upsert(request.body)
    },
  )
}

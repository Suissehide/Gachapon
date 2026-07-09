import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

const publicStatsSchema = z.object({
  totalUsers: z.number(),
  totalPulls: z.number(),
  totalCards: z.number(),
  activeUsers: z.number(),
  legendaryPulls: z.number(),
  pullsToday: z.number(),
  totalDust: z.number(),
  setsCount: z.number(),
  legendaryCardsCount: z.number(),
})

export const statsRouter: FastifyPluginCallbackZod = (fastify) => {
  fastify.get(
    '/stats',
    { schema: { tags: ['Stats'], response: { 200: publicStatsSchema } } },
    () => {
      return fastify.iocContainer.statsRepository.getPublicStats()
    },
  )
}

import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

export const adminStatsRouter: FastifyPluginCallbackZod = (fastify) => {
  const { adminStatsRepository } = fastify.iocContainer

  fastify.get('/dashboard', async () => {
    return adminStatsRepository.getDashboard()
  })

  fastify.get('/stats', async () => {
    return adminStatsRepository.getDetailedStats()
  })
}

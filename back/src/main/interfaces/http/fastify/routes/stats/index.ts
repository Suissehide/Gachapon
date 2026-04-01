import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

export const statsRouter: FastifyPluginCallbackZod = (fastify) => {
  fastify.get('/stats', { schema: { tags: ['Stats'] } }, async () => {
    return fastify.iocContainer.statsRepository.getPublicStats()
  })
}

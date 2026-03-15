import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

export const routes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get('/', async () => ({ name: 'Gachapon API', status: 'running', version: '1.0.0' }))
}

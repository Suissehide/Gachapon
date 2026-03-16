import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { apiKeysRouter } from './api-keys'
import { authRouter } from './auth'
import { collectionRouter } from './collection'
import { gachaRouter } from './gacha'

export const routes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get('/', async () => ({
    name: 'Gachapon API',
    status: 'running',
    version: '1.0.0',
  }))
  await fastify.register(authRouter, { prefix: '/auth' })
  await fastify.register(apiKeysRouter, { prefix: '/api-keys' })
  await fastify.register(gachaRouter)
  await fastify.register(collectionRouter)
}

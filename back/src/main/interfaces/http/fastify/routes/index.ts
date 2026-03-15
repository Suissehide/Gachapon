import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authRouter } from './auth/index.js'

export const routes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get('/', async () => ({ name: 'Gachapon API', status: 'running', version: '1.0.0' }))
  await fastify.register(authRouter, { prefix: '/auth' })
}

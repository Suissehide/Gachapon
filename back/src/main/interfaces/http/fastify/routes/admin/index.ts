// back/src/main/interfaces/http/fastify/routes/admin/index.ts
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { adminConfigRouter } from './config.router'
import { adminStatsRouter } from './stats.router'
import { adminUsersRouter } from './users.router'

// biome-ignore lint/suspicious/useAwait: fastify plugin pattern
export const adminRouter: FastifyPluginAsyncZod = async (fastify) => {
  await fastify.register(adminUsersRouter, { prefix: '/users' })
  await fastify.register(adminConfigRouter, { prefix: '/config' })
  await fastify.register(adminStatsRouter)
}

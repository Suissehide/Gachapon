import fastifyRateLimit from '@fastify/rate-limit'
import type { FastifyInstance } from 'fastify'
import fastifyPlugin from 'fastify-plugin'

const rateLimitPlugin = fastifyPlugin(async (fastify: FastifyInstance) => {
  const { config } = fastify.iocContainer
  await fastify.register(fastifyRateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitTimeWindow,
    allowList: (request) => {
      const url = request.url.split('?')[0]
      return url === '/' || url === '/health' || url.startsWith('/api-docs')
    },
  })
})

export { rateLimitPlugin }

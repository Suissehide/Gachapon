import scalarFastify from '@scalar/fastify-api-reference'
import type { FastifyInstance } from 'fastify'
import fastifyPlugin from 'fastify-plugin'

const scalarPlugin = fastifyPlugin(async (fastify: FastifyInstance) => {
  await fastify.register(scalarFastify, {
    routePrefix: '/api-docs',
    configuration: {
      spec: { url: '/openapi.json' },
    },
  })
})

export { scalarPlugin }

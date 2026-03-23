import fastifySwagger from '@fastify/swagger'
import type { FastifyInstance } from 'fastify'
import fastifyPlugin from 'fastify-plugin'
import { jsonSchemaTransform } from 'fastify-type-provider-zod'

const swaggerPlugin = fastifyPlugin(async (fastify: FastifyInstance) => {
  await fastify.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Gachapon API',
        version: '1.0.0',
        description: 'Public API for the Gachapon gacha game platform.',
      },
      components: {
        securitySchemes: {
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'access_token',
          },
          apiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  })
})

export { swaggerPlugin }

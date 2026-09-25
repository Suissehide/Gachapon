import fastifyRateLimit from '@fastify/rate-limit'
import { forbidden, tooManyRequests } from '@hapi/boom'
import type { FastifyInstance } from 'fastify'
import fastifyPlugin from 'fastify-plugin'

// Le builder par défaut du plugin renvoie une Error nue (statusCode sans
// code) qu'aucun normalizer ne reconnaît — elle ressortait en 500. Un Boom
// passe par boomErrorNormalizer et conserve le 429 (ou 403 en cas de ban).
const rateLimitErrorResponseBuilder = (context: {
  statusCode: number
  after: string
  ban: boolean
}) => {
  const message = `Rate limit exceeded, retry in ${context.after}`
  return context.ban ? forbidden(message) : tooManyRequests(message)
}

const rateLimitPlugin = fastifyPlugin(async (fastify: FastifyInstance) => {
  const { config, redisClient } = fastify.iocContainer
  await fastify.register(fastifyRateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitTimeWindow,
    ...(config.rateLimitStore === 'redis' && {
      redis: redisClient.client,
      // Redis tombé : on laisse passer plutôt que de rendre tout le site en
      // 500. Le rate limit est un garde-fou, pas une dépendance critique.
      skipOnError: true,
    }),
    allowList: (request) => {
      const url = request.url.split('?')[0] ?? request.url
      return url === '/' || url === '/health' || url.startsWith('/api-docs')
    },
    errorResponseBuilder: (_request, context) =>
      rateLimitErrorResponseBuilder(context),
  })
})

export { rateLimitErrorResponseBuilder, rateLimitPlugin }

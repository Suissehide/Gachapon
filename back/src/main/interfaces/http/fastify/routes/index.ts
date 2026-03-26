import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { adminRouter } from './admin'
import { apiKeysRouter } from './api-keys'
import { authRouter } from './auth'
import { collectionRouter } from './collection'
import { gachaRouter } from './gacha'
import { leaderboardRouter } from './leaderboard'
import { rewardsRouter } from './rewards'
import { streakRouter } from './streak'
import { shopRouter } from './shop'
import { statsRouter } from './stats'
import { teamsRouter } from './teams'
import { upgradesRouter } from './upgrades'
import { usersRouter } from './users'
import { wsRouter } from './ws'

export const routes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get('/', async () => ({
    name: 'Gachapon API',
    status: 'running',
    version: '1.0.0',
  }))
  fastify.get('/health', async () => ({ status: 'ok' }))

  // Annotate protected routes with security schemes in the OpenAPI spec.
  // Only detects verifySessionCookie when passed directly in route onRequest options.
  fastify.addHook('onRoute', (route) => {
    const onRequest = Array.isArray(route.onRequest)
      ? route.onRequest
      : route.onRequest
        ? [route.onRequest]
        : []
    if (onRequest.includes(fastify.verifySessionCookie)) {
      route.schema = {
        ...route.schema,
        security: [{ cookieAuth: [] }, { apiKeyAuth: [] }],
      }
    }
  })

  // Serve OpenAPI spec — hidden from the spec itself
  fastify.get('/openapi.json', { schema: { hide: true } }, async () => {
    return fastify.swagger()
  })

  await fastify.register(authRouter, { prefix: '/auth' })
  await fastify.register(apiKeysRouter, { prefix: '/api-keys' })
  await fastify.register(gachaRouter)
  await fastify.register(collectionRouter)
  await fastify.register(leaderboardRouter)
  await fastify.register(shopRouter)
  await fastify.register(wsRouter)
  await fastify.register(usersRouter)
  await fastify.register(teamsRouter)
  await fastify.register(upgradesRouter)
  await fastify.register(statsRouter)
  await fastify.register(rewardsRouter, { prefix: '/rewards' })
  await fastify.register(streakRouter, { prefix: '/streak' })
  await fastify.register(adminRouter, { prefix: '/admin' })
}

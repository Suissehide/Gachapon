import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { achievementsRouter } from './achievements'
import { adminRouter } from './admin'
import { apiKeysRouter } from './api-keys'
import { authRouter } from './auth'
import { campaignRouter } from './campaign'
import { cardsRouter } from './cards'
import { collectionRouter } from './collection'
import { combatRouter } from './combat'
import { dailyShopRouter } from './daily-shop'
import { economyRouter } from './economy'
import { equipmentRouter } from './equipment'
import { gachaRouter } from './gacha'
import { leaderboardRouter } from './leaderboard'
import { questsRouter } from './quests'
import { raidsRouter } from './raids'
import { rewardsRouter } from './rewards'
import { shopRouter } from './shop'
import { skillsRouter } from './skills'
import { statsRouter } from './stats'
import { streakRouter } from './streak'
import { teamsRouter } from './teams'
import { towerRouter } from './tower'
import { usersRouter } from './users'
import { wagersRouter } from './wagers'
import { wishlistRouter } from './wishlist'
import { wsRouter } from './ws'

// Regroupement de la référence API (/api-docs) : le tag se déduit du chemin,
// au plus long préfixe — un endpoint ne porte jamais de `tags` à la main.
// Les tags eux-mêmes (ordre + descriptions) sont déclarés dans
// `plugins/swagger.plugin.ts`.
const TAG_BY_PATH_PREFIX: [prefix: string, tag: string][] = [
  ['/auth', 'Auth'],
  ['/api-keys', 'API keys'],
  ['/pulls', 'Gacha'],
  ['/tokens', 'Gacha'],
  ['/users/:id/collection', 'Collection'],
  ['/collection', 'Collection'],
  ['/cards', 'Collection'],
  ['/sets', 'Collection'],
  ['/wishlist', 'Wishlist'],
  ['/users', 'Users'],
  ['/leaderboard', 'Leaderboard'],
  ['/streak', 'Progression'],
  ['/quests', 'Progression'],
  ['/achievements', 'Progression'],
  ['/rewards', 'Progression'],
  ['/skills', 'Progression'],
  ['/shop', 'Shop'],
  ['/daily-shop', 'Shop'],
  ['/combat', 'Combat'],
  ['/equipment', 'Combat'],
  ['/campaign', 'Campaign'],
  ['/tower', 'Tower'],
  ['/teams/:id/raid', 'Raid'],
  ['/teams/:id/bets', 'Wagers'],
  ['/teams/:id/duels', 'Wagers'],
  ['/teams/:id/wagers', 'Wagers'],
  ['/me/bets', 'Wagers'],
  ['/me/duels', 'Wagers'],
  ['/teams', 'Teams'],
  ['/me', 'Teams'],
  ['/invitations', 'Teams'],
  ['/join-requests', 'Teams'],
  ['/economy', 'Game data'],
  ['/stats', 'Game data'],
]

function tagForPath(url: string): string | undefined {
  let best: [string, string] | undefined
  for (const entry of TAG_BY_PATH_PREFIX) {
    const [prefix] = entry
    const matches = url === prefix || url.startsWith(`${prefix}/`)
    if (matches && (!best || prefix.length > best[0].length)) {
      best = entry
    }
  }
  return best?.[1]
}

export const routes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get('/', { schema: { hide: true } }, async () => ({
    name: 'Gachapon API',
    status: 'running',
    version: '1.0.0',
  }))
  fastify.get('/health', { schema: { hide: true } }, async () => ({
    status: 'ok',
  }))

  // Annotate protected routes with security schemes in the OpenAPI spec.
  // Only detects verifySessionCookie when passed directly in route onRequest options.
  fastify.addHook('onRoute', (route) => {
    const tag = tagForPath(route.url)
    if (tag) {
      route.schema = { ...route.schema, tags: [tag] }
    }
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
  fastify.get('/openapi.json', { schema: { hide: true } }, () => {
    return fastify.swagger()
  })

  await fastify.register(authRouter, { prefix: '/auth' })
  await fastify.register(apiKeysRouter, { prefix: '/api-keys' })
  await fastify.register(gachaRouter)
  await fastify.register(cardsRouter)
  await fastify.register(collectionRouter)
  await fastify.register(combatRouter)
  await fastify.register(campaignRouter)
  await fastify.register(leaderboardRouter)
  await fastify.register(questsRouter)
  await fastify.register(shopRouter)
  await fastify.register(dailyShopRouter)
  await fastify.register(economyRouter)
  await fastify.register(equipmentRouter)
  await fastify.register(skillsRouter)
  await fastify.register(wsRouter)
  await fastify.register(usersRouter)
  await fastify.register(wishlistRouter)
  await fastify.register(teamsRouter)
  await fastify.register(raidsRouter)
  await fastify.register(wagersRouter)
  await fastify.register(towerRouter)
  await fastify.register(statsRouter)
  await fastify.register(rewardsRouter, { prefix: '/rewards' })
  await fastify.register(achievementsRouter, { prefix: '/achievements' })
  await fastify.register(streakRouter, { prefix: '/streak' })
  await fastify.register(adminRouter, { prefix: '/admin' })
}

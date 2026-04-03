import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { adminAchievementsRouter } from './achievements.router'
import { adminCardsRouter } from './cards.router'
import { adminConfigRouter } from './config.router'
import { adminMediaRouter } from './media.router'
import { adminQuestsRouter } from './quests.router'
import { adminScoringConfigRouter } from './scoring-config.router'
import { adminSetsRouter } from './sets.router'
import { adminShopRouter } from './shop.router'
import { adminStatsRouter } from './stats.router'
import { adminSkillsRouter } from './skills.router'
import { adminStreakRouter } from './streak.router'
import { adminUsersRouter } from './users.router'

export const adminRouter: FastifyPluginAsyncZod = async (fastify) => {
  // Auth appliquée au scope entier : toutes les routes /admin/* sont protégées
  fastify.addHook('onRequest', fastify.verifySessionCookie)
  fastify.addHook('onRequest', fastify.requireRole('SUPER_ADMIN'))

  // Hide all admin routes from the public OpenAPI spec
  fastify.addHook('onRoute', (route) => {
    route.schema = {
      ...route.schema,
      hide: true,
    }
  })

  await fastify.register(adminUsersRouter, { prefix: '/users' })
  await fastify.register(adminConfigRouter, { prefix: '/config' })
  await fastify.register(adminStatsRouter)
  await fastify.register(adminSetsRouter, { prefix: '/sets' })
  await fastify.register(adminCardsRouter, { prefix: '/cards' })
  await fastify.register(adminShopRouter, { prefix: '/shop-items' })
  await fastify.register(adminQuestsRouter, { prefix: '/quests' })
  await fastify.register(adminAchievementsRouter, { prefix: '/achievements' })
  await fastify.register(adminScoringConfigRouter, {
    prefix: '/scoring-config',
  })
  await fastify.register(adminMediaRouter, { prefix: '/media' })
  await fastify.register(adminStreakRouter, { prefix: '/streak' })
  await fastify.register(adminSkillsRouter)
}

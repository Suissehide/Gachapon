// back/src/main/interfaces/http/fastify/routes/admin/index.ts
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { adminAchievementsRouter } from './achievements.router'
import { adminCardsRouter } from './cards.router'
import { adminConfigRouter } from './config.router'
import { adminQuestsRouter } from './quests.router'
import { adminSetsRouter } from './sets.router'
import { adminShopRouter } from './shop.router'
import { adminStatsRouter } from './stats.router'
import { adminUpgradesRouter } from './upgrades.router'
import { adminUsersRouter } from './users.router'

export const adminRouter: FastifyPluginAsyncZod = async (fastify) => {
  await fastify.register(adminUsersRouter, { prefix: '/users' })
  await fastify.register(adminConfigRouter, { prefix: '/config' })
  await fastify.register(adminStatsRouter)
  await fastify.register(adminSetsRouter, { prefix: '/sets' })
  await fastify.register(adminCardsRouter, { prefix: '/cards' })
  await fastify.register(adminShopRouter, { prefix: '/shop-items' })
  await fastify.register(adminQuestsRouter, { prefix: '/quests' })
  await fastify.register(adminAchievementsRouter, { prefix: '/achievements' })
  await fastify.register(adminUpgradesRouter, { prefix: '/upgrades' })
}

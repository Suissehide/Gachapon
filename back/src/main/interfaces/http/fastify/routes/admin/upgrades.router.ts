import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import { adminUpgradesBulkBodySchema } from '../../schemas/admin-upgrades.schema'

export const adminUpgradesRouter: FastifyPluginCallbackZod = (fastify) => {
  const { upgradeRepository } = fastify.iocContainer

  fastify.get('/', async () => {
    return upgradeRepository.findAllConfigs()
  })

  fastify.put(
    '/',
    { schema: { body: adminUpgradesBulkBodySchema } },
    async (request) => {
      const { upgrades } = request.body
      await upgradeRepository.bulkUpdateConfigs(upgrades)
      return { updated: upgrades.length }
    },
  )
}

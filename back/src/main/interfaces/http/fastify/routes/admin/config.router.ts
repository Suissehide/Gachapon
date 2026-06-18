import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'

import {
  CONFIG_KEYS,
  type ConfigKey,
} from '../../../../../types/infra/config/config.service.interface'
import { adminConfigUpdateBodySchema } from '../../schemas/admin-config.schemas'

export const adminConfigRouter: FastifyPluginCallbackZod = (fastify) => {
  // GET /admin/config
  fastify.get('/', () => {
    const { configService } = fastify.iocContainer
    return configService.getMany(...CONFIG_KEYS)
  })

  // PUT /admin/config
  fastify.put(
    '/',
    { schema: { body: adminConfigUpdateBodySchema } },
    async (request) => {
      const { configService } = fastify.iocContainer
      const updates = Object.entries(request.body).filter(
        ([, v]) => v !== undefined,
      ) as [ConfigKey, number][]
      await Promise.all(
        updates.map(([key, value]) => configService.set(key, value)),
      )
      return { updated: updates.map(([key]) => key) }
    },
  )
}

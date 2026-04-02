import type { FastifyPluginCallbackZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

import {
  CONFIG_KEYS,
  type ConfigKey,
} from '../../../../../types/infra/config/config.service.interface'

export const adminConfigRouter: FastifyPluginCallbackZod = (fastify) => {
  // GET /admin/config
  fastify.get('/', () => {
    const { configService } = fastify.iocContainer
    return configService.getMany(...CONFIG_KEYS)
  })

  // PUT /admin/config
  fastify.put(
    '/',
    {
      schema: {
        body: z.object({
          tokenRegenIntervalMinutes: z.number().int().positive().optional(),
          tokenMaxStock: z.number().int().positive().optional(),
          pityThreshold: z.number().int().min(1).optional(),
          dustCommon: z.number().int().min(0).optional(),
          dustUncommon: z.number().int().min(0).optional(),
          dustRare: z.number().int().min(0).optional(),
          dustEpic: z.number().int().min(0).optional(),
          dustLegendary: z.number().int().min(0).optional(),
          holoRateRare: z.number().min(0).max(100).optional(),
          holoRateEpic: z.number().min(0).max(100).optional(),
          holoRateLegendary: z.number().min(0).max(100).optional(),
          brilliantRateRare: z.number().min(0).max(100).optional(),
          brilliantRateEpic: z.number().min(0).max(100).optional(),
          brilliantRateLegendary: z.number().min(0).max(100).optional(),
          variantMultiplierHolo: z.number().min(1).optional(),
          variantMultiplierBrilliant: z.number().min(1).optional(),
        }),
      },
    },
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

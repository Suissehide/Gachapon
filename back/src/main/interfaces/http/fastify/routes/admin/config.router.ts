// back/src/main/interfaces/http/fastify/routes/admin/config.router.ts
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod/v4'

const CONFIG_KEYS = ['tokenRegenIntervalHours', 'tokenMaxStock', 'pityThreshold', 'dustCommon', 'dustUncommon', 'dustRare', 'dustEpic', 'dustLegendary', 'holoRateRare', 'holoRateEpic', 'holoRateLegendary', 'brilliantRateRare', 'brilliantRateEpic', 'brilliantRateLegendary'] as const

// biome-ignore lint/suspicious/useAwait: fastify plugin pattern
export const adminConfigRouter: FastifyPluginAsyncZod = async (fastify) => {
  const auth = [fastify.verifySessionCookie, fastify.requireRole('SUPER_ADMIN')]

  // GET /admin/config
  fastify.get(
    '/',
    { onRequest: auth },
    async () => {
      const { configService } = fastify.iocContainer
      const entries = await Promise.all(
        CONFIG_KEYS.map(async (key) => [key, await configService.get(key)] as const),
      )
      return Object.fromEntries(entries)
    },
  )

  // PUT /admin/config
  fastify.put(
    '/',
    {
      onRequest: auth,
      schema: {
        body: z.object({
          tokenRegenIntervalHours: z.number().positive().optional(),
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
        }),
      },
    },
    async (request) => {
      const { configService } = fastify.iocContainer
      const updates = Object.entries(request.body).filter(([, v]) => v !== undefined) as [string, number][]
      await Promise.all(updates.map(([key, value]) => configService.set(key, value)))
      return { updated: updates.map(([key]) => key) }
    },
  )
}

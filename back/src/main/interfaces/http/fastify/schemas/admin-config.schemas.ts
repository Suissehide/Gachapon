import { z } from 'zod/v4'

export const adminConfigUpdateBodySchema = z.object({
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
})

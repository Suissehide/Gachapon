import { z } from 'zod/v4'

export const adminScoringConfigBodySchema = z.object({
  commonPoints: z.number().int().min(0),
  uncommonPoints: z.number().int().min(0),
  rarePoints: z.number().int().min(0),
  epicPoints: z.number().int().min(0),
  legendaryPoints: z.number().int().min(0),
  brilliantMultiplier: z.number().min(1.0),
  holographicMultiplier: z.number().min(1.0),
})

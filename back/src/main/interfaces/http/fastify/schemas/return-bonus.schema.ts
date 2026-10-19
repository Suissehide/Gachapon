import { z } from 'zod/v4'

export const returnChestSchema = z.object({
  days: z.number().int(),
  cappedDays: z.number().int(),
  tokens: z.number().int(),
  energy: z.number().int(),
})

export const returnChestClaimResponseSchema = z.object({
  tokens: z.number().int(),
  combatPoints: z.number().int(),
  gained: returnChestSchema,
})

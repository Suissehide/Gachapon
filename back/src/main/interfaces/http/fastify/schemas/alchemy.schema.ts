import { z } from 'zod/v4'

export const transmuteBodySchema = z.object({
  fromRarity: z.enum(['COMMON', 'UNCOMMON', 'RARE', 'EPIC']),
  picks: z
    .array(
      z.object({
        userCardId: z.string().uuid(),
        amount: z.number().int().min(1),
      }),
    )
    .min(1)
    .max(20),
})

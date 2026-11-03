import { z } from 'zod/v4'

import { ALCHEMY_BATCH_SIZE } from '../../../../domain/alchemy/alchemy-rules'

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
    .max(100),
  count: z.number().int().min(1).max(ALCHEMY_BATCH_SIZE).default(1),
})

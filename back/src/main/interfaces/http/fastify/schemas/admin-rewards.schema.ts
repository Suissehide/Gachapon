import { z } from 'zod/v4'

export const adminBulkRewardBodySchema = z.object({
  target: z.union([
    z.literal('ALL'),
    z.object({ userIds: z.array(z.string().uuid()).min(1).max(10000) }),
  ]),
  reward: z.object({
    tokens: z.number().int().min(0).default(0),
    dust: z.number().int().min(0).default(0),
    xp: z.number().int().min(0).default(0),
    gold: z.number().int().min(0).default(0),
    cardRarity: z
      .enum(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'])
      .optional(),
  }),
  message: z.string().max(200).optional(),
})

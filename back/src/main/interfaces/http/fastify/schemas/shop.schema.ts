import { z } from 'zod/v4'

import { unlockedAchievementSchema } from './achievements.schemas'

export const shopItemIdParamSchema = z.object({ id: z.string().uuid() })

// ── GET /shop response ────────────────────────────────────────────────────────

export const getShopResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      type: z.string(),
      dustCost: z.number(),
      value: z.unknown(),
      activeBoost: z.object({ pullsRemaining: z.number().int() }).nullable(),
    }),
  ),
})

// ── POST /shop/:id/buy response ────────────────────────────────────────────

export const buyShopItemResponseSchema = z.object({
  purchaseId: z.string(),
  dustSpent: z.number(),
  newDustTotal: z.number(),
  newTokenTotal: z.number(),
  unlockedAchievements: z.array(unlockedAchievementSchema).optional(),
  item: z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    value: z.unknown(),
  }),
})

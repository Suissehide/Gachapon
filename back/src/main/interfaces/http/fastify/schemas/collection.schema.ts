import { z } from 'zod/v4'

import { unlockedAchievementSchema } from './achievements.schemas'

export const collectionCardsQuerySchema = z.object({
  setId: z.string().optional(),
  rarity: z.string().optional(),
})

export const collectionCardIdParamSchema = z.object({ id: z.string().uuid() })

export const collectionUserIdParamSchema = z.object({ id: z.string().uuid() })

export const collectionRecycleBodySchema = z.object({
  cardId: z.string().uuid(),
  quantity: z.number().int().min(1).default(1),
  variant: z.enum(['NORMAL', 'BRILLIANT', 'HOLOGRAPHIC']).default('NORMAL'),
})

export const collectionRecycleResponseSchema = z.object({
  dustEarned: z.number().int(),
  newDustTotal: z.number().int(),
  unlockedAchievements: z.array(unlockedAchievementSchema).optional(),
})

export const collectionRecycleAllBodySchema = z.object({
  maxRarity: z.enum(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']),
})

export const collectionRecycleAllResponseSchema = z.object({
  dustEarned: z.number().int(),
  cardsRecycled: z.number().int(),
  newDustTotal: z.number().int(),
  unlockedAchievements: z.array(unlockedAchievementSchema).optional(),
})

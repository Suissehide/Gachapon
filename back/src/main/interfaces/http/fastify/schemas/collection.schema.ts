import { z } from 'zod/v4'

import { unlockedAchievementSchema } from './achievements.schemas'
import { cardArchetypeEnum, cardElementEnum } from './admin-cards.schema'

export const collectionCardsQuerySchema = z.object({
  setId: z.string().optional(),
  rarity: z.string().optional(),
})

export const collectionCardIdParamSchema = z.object({ id: z.string().uuid() })

export const collectionUserIdParamSchema = z.object({ id: z.string().uuid() })

export const collectionRecycleBodySchema = z.object({
  cardId: z.string().uuid(),
  quantity: z.number().int().min(1).default(1),
})

const cardVariantEnum = z.enum(['NORMAL', 'BRILLIANT', 'HOLOGRAPHIC'])

export const collectionUserCardIdParamSchema = z.object({
  userCardId: z.string().uuid(),
})

export const collectionFinishBodySchema = z.object({ finish: cardVariantEnum })

export const collectionFinishResponseSchema = z.object({
  displayedFinish: cardVariantEnum,
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
  skippedEngaged: z.number().int(),
})

export const userCollectionResponseSchema = z.object({
  cards: z.array(
    z.object({
      id: z.string(),
      card: z.object({
        id: z.string(),
        name: z.string(),
        imageUrl: z.string().nullable(),
        rarity: z.string(),
        element: cardElementEnum.nullable(),
        set: z.object({ id: z.string(), name: z.string() }),
        baseHp: z.number().int(),
        baseAtk: z.number().int(),
        baseDef: z.number().int(),
        baseSpd: z.number().int(),
        passiveKey: z.string().nullable(),
        archetype: cardArchetypeEnum,
      }),
      finishes: z.array(cardVariantEnum),
      displayedFinish: cardVariantEnum,
      quantity: z.number().int(),
      level: z.number().int(),
      palier: z.number().int(),
      obtainedAt: z.string(),
    }),
  ),
})

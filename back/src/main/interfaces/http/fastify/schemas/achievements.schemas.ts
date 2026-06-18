import { z } from 'zod/v4'

import { CardRarity } from '../../../../../generated/client'

const cardRarityEnum = z.enum(
  Object.values(CardRarity) as [CardRarity, ...CardRarity[]],
)

export const unlockedAchievementSchema = z.object({
  key: z.string(),
  name: z.string(),
  iconKey: z.string().nullable(),
  reward: z
    .object({
      tokens: z.number().int(),
      dust: z.number().int(),
      xp: z.number().int(),
      cardRarity: cardRarityEnum.nullable(),
    })
    .nullable(),
})

// ── User-facing achievements list ────────────────────────────────────────
// `z.coerce.date()` accepts both Date objects (from the domain layer) and
// ISO strings (after JSON serialisation), so the response schema validates
// in both directions without false negatives.
export const achievementWithProgressSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string(),
  family: z.string().nullable(),
  tier: z.number().int(),
  hidden: z.boolean(),
  iconKey: z.string().nullable(),
  sortOrder: z.number().int(),
  progress: z.number().int(),
  threshold: z.number().int(),
  unlocked: z.boolean(),
  unlockedAt: z.coerce.date().nullable(),
  reward: z
    .object({
      tokens: z.number().int(),
      dust: z.number().int(),
      xp: z.number().int(),
      cardRarity: cardRarityEnum.nullable(),
    })
    .nullable(),
})

export const achievementsListResponseSchema = z.array(
  achievementWithProgressSchema,
)

export const familySummarySchema = z.object({
  family: z.string(),
  total: z.number().int(),
  unlocked: z.number().int(),
})

export const achievementsFamiliesResponseSchema = z.array(familySummarySchema)

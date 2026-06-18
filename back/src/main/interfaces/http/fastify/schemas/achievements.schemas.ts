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
// The domain layer converts `unlockedAt` to an ISO string before returning,
// so the wire format is plain JSON (no Date objects). This avoids the
// FST_ERR_RESPONSE_SERIALIZATION error fast-json-stringify raises on Date
// instances in the response.
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
  unlockedAt: z.string().datetime().nullable(),
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

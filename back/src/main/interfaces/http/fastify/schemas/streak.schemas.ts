import { z } from 'zod/v4'

import { CardRarity } from '../../../../../generated/client'

const cardRaritySchema = z.enum(
  Object.values(CardRarity) as [CardRarity, ...CardRarity[]],
)

const rewardSchema = z.object({
  tokens: z.number().int(),
  dust: z.number().int(),
  xp: z.number().int(),
  cardRarity: cardRaritySchema.nullable(),
})

const dayEntrySchema = rewardSchema.extend({
  day: z.number().int(),
  isMilestone: z.boolean(),
  status: z.enum(['past', 'current', 'future']),
})

// ── GET /streak/summary ─────────────────────────────────────────────────────

export const streakSummaryResponseSchema = z.object({
  streakDays: z.number().int(),
  bestStreak: z.number().int(),
  default: rewardSchema,
  days: z.array(dayEntrySchema),
  // The next milestone the user will reach in their current 30-day cycle.
  // null if no upcoming milestone exists. Used by the UI to render a "Final" preview card.
  nextMilestone: dayEntrySchema.nullable(),
})

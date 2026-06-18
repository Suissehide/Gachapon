import { z } from 'zod/v4'

import { unlockedAchievementSchema } from './achievements.schemas'

// ── POST /pulls ─────────────────────────────────────────────────────────────

export const pullResponseSchema = z.object({
  card: z.object({
    id: z.string(),
    name: z.string(),
    imageUrl: z.string().nullable(),
    rarity: z.string(),
    variant: z.string(),
    set: z.object({ id: z.string(), name: z.string() }),
  }),
  wasDuplicate: z.boolean(),
  dustEarned: z.number().int(),
  tokensRemaining: z.number().int(),
  pityCurrent: z.number().int(),
  xpGained: z.number().int(),
  unlockedAchievements: z.array(unlockedAchievementSchema).optional(),
})

// ── GET /pulls/history ──────────────────────────────────────────────────────

export const pullsHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// ── GET /pulls/recent ───────────────────────────────────────────────────────

export const pullsRecentQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  before: z.string().datetime().optional(),
  teamId: z.string().uuid().optional(),
})

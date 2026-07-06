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
  wasFreePull: z.boolean(),
  wasGoldenBall: z.boolean(),
})

// ── POST /pulls/batch ────────────────────────────────────────────────────────

export const pullBatchBodySchema = z.object({
  count: z.union([z.literal(1), z.literal(10)]),
})

export const pullBatchResponseSchema = z.object({
  pulls: z.array(
    z.object({
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
      pityCurrent: z.number().int(),
      wasFreePull: z.boolean(),
      wasGoldenBall: z.boolean(),
    }),
  ),
  tokensRemaining: z.number().int(),
  xpGained: z.number().int(),
  unlockedAchievements: z.array(unlockedAchievementSchema).optional(),
})

// ── GET /pulls/history ──────────────────────────────────────────────────────

export const pullsHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// ── GET /pulls/recent ───────────────────────────────────────────────────────

const cardRarityEnum = z.enum([
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
])

// Comma-separated list (e.g. ?rarities=EPIC,LEGENDARY). Parsed into an
// array on the server side because Fastify only ships strings in querystrings.
const raritiesCsvSchema = z
  .string()
  .transform((raw) =>
    raw
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0),
  )
  .pipe(z.array(cardRarityEnum))
  .optional()

export const pullsRecentQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  before: z.string().datetime().optional(),
  teamId: z.string().uuid().optional(),
  rarities: raritiesCsvSchema,
})

// ── GET /pulls/rates ────────────────────────────────────────────────────────

export const dropRatesResponseSchema = z.object({
  rates: z.array(z.object({ rarity: cardRarityEnum, pct: z.number() })),
})

// ── GET /tokens/balance ─────────────────────────────────────────────────────

export const tokensBalanceResponseSchema = z.object({
  tokens: z.number().int(),
  maxStock: z.number().int(),
  nextTokenAt: z.string().nullable(),
  pityCurrent: z.number().int(),
  pityThreshold: z.number().int(),
})

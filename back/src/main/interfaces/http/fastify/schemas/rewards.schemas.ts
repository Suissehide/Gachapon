import { z } from 'zod/v4'

import { unlockedAchievementSchema } from './achievements.schemas'

const cardRarityEnum = z.enum([
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
])

const cardVariantEnum = z.enum(['NORMAL', 'BRILLIANT', 'HOLOGRAPHIC'])

const rewardAmountsSchema = z.object({
  tokens: z.number().int(),
  dust: z.number().int(),
  xp: z.number().int(),
  gold: z.number().int().optional(),
  cardRarity: cardRarityEnum.nullable().optional(),
})

const rewardSourceEnum = z.enum(['STREAK', 'ACHIEVEMENT', 'QUEST', 'LEVEL_UP'])

// A card actually granted by claiming a reward — mirrors the front's PullBatchEntry.
const claimedCardSchema = z.object({
  card: z.object({
    id: z.string(),
    name: z.string(),
    imageUrl: z.string().nullable(),
    rarity: cardRarityEnum,
    variant: cardVariantEnum,
    set: z.object({ id: z.string(), name: z.string() }),
  }),
  wasDuplicate: z.boolean(),
})

// ── POST /rewards/:id/claim & /claim-all responses ─────────────────────────

export const claimResultSchema = z.object({
  tokens: z.number().int(),
  dust: z.number().int(),
  xp: z.number().int(),
  level: z.number().int(),
  gold: z.number().int(),
  pendingRewardsCount: z.number().int().nonnegative(),
  unlockedAchievements: z.array(unlockedAchievementSchema).optional(),
  cards: z.array(claimedCardSchema).optional(),
})

// ── GET /rewards/pending ───────────────────────────────────────────────────

export const pendingRewardSchema = z.object({
  id: z.string().uuid(),
  source: rewardSourceEnum,
  sourceId: z.string().nullable(),
  // Human-readable title of the reward's source (e.g. the achievement name).
  // Null for sources without a title (streak days, level-up milestones).
  sourceTitle: z.string().nullable(),
  claimedAt: z.date().nullable(),
  createdAt: z.date(),
  reward: rewardAmountsSchema,
  streakMilestone: z
    .object({ day: z.number().int(), isMilestone: z.boolean() })
    .nullable(),
})

export const pendingRewardsResponseSchema = z.array(pendingRewardSchema)

// ── POST /rewards/:id/claim params ─────────────────────────────────────────

export const claimRewardParamsSchema = z.object({ id: z.string().uuid() })

// ── GET /rewards/history ───────────────────────────────────────────────────

export const rewardHistoryItemSchema = z.object({
  id: z.string().uuid(),
  source: rewardSourceEnum,
  sourceId: z.string().nullable(),
  claimedAt: z.date().nullable(),
  createdAt: z.date(),
  reward: rewardAmountsSchema,
})

export const rewardsHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const rewardsHistoryResponseSchema = z.object({
  data: z.array(rewardHistoryItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
})

// ── POST /rewards/claim-all 204 no-body marker ─────────────────────────────
export const noBodySchema = z.null()

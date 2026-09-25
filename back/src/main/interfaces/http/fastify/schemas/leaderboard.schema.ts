import { z } from 'zod/v4'

// Miroir des types de `types/domain/leaderboard/leaderboard.domain.interface.ts`.

const leaderboardUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  level: z.number().int(),
  avatar: z.string().nullable(),
})

const collectorEntrySchema = z.object({
  rank: z.number().int(),
  user: leaderboardUserSchema,
  cardPercentage: z.number(),
  variantPercentage: z.number(),
  pulls: z.number().int(),
  legendaries: z.number().int(),
})

const teamEntrySchema = z.object({
  rank: z.number().int(),
  team: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    memberCount: z.number().int(),
  }),
  cardPercentage: z.number(),
  variantPercentage: z.number(),
  pullsTotal: z.number().int(),
})

const combatEntrySchema = z.object({
  rank: z.number().int(),
  user: leaderboardUserSchema,
  palier: z.number().int(),
  maxPalier: z.number().int(),
  combatPower: z.number(),
})

export const collectorsLeaderboardResponseSchema = z.object({
  entries: z.array(collectorEntrySchema),
  currentUserEntry: collectorEntrySchema.nullable(),
  totalCount: z.number().int(),
})

export const teamsLeaderboardResponseSchema = z.object({
  entries: z.array(teamEntrySchema),
  currentUserEntry: teamEntrySchema.nullable(),
  totalCount: z.number().int(),
  currentUserTeamId: z.string().nullable().optional(),
})

export const combatLeaderboardResponseSchema = z.object({
  entries: z.array(combatEntrySchema),
  currentUserEntry: combatEntrySchema.nullable(),
  totalCount: z.number().int(),
})

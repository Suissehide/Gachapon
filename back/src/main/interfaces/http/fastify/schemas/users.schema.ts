import { z } from 'zod/v4'

export const usersSearchQuerySchema = z.object({ q: z.string().min(2).max(30) })

export const usersProfileParamSchema = z.object({ username: z.string().min(1).max(30) })

export const userProfileResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatar: z.string().nullable(),
  banner: z.string().nullable(),
  level: z.number().int(),
  xp: z.number().int(),
  dust: z.number().int(),
  createdAt: z.date(),
  stats: z.object({
    totalPulls: z.number().int(),
    ownedCards: z.number().int(),
    legendaryCount: z.number().int(),
    dustGenerated: z.number().int(),
  }),
  streakDays: z.number().int(),
  bestStreak: z.number().int(),
})

import { z } from 'zod/v4'

export const registerBodySchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/),
  email: z.email(),
  password: z.string().min(8).max(100),
})

export const loginBodySchema = z.object({
  email: z.email(),
  password: z.string(),
})

export const unlockedAchievementSchema = z.object({
  key: z.string(),
  name: z.string(),
  iconKey: z.string().nullable(),
  reward: z
    .object({
      tokens: z.number(),
      dust: z.number(),
      xp: z.number(),
      cardRarity: z.string().nullable(),
    })
    .nullable(),
})

export const userResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  role: z.string(),
  tokens: z.number(),
  dust: z.number(),
  avatar: z.string().nullable(),
  banner: z.string().nullable(),
  createdAt: z.date(),
  pendingRewardsCount: z.number().int().nonnegative(),
  unlockedAchievements: z.array(unlockedAchievementSchema).default([]),
})

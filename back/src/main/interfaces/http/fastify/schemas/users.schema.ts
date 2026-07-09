import { z } from 'zod/v4'

export const usersSearchQuerySchema = z.object({ q: z.string().min(2).max(30) })

export const usersProfileParamSchema = z.object({
  username: z.string().min(1).max(30),
})

export const userProfileResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatar: z.string().nullable(),
  banner: z.string().nullable(),
  level: z.number().int(),
  xp: z.number().int(),
  dust: z.number().int(),
  createdAt: z.date(),
  lastLoginAt: z.date().nullable(),
  stats: z.object({
    totalPulls: z.number().int(),
    ownedCards: z.number().int(),
    legendaryCount: z.number().int(),
    dustGenerated: z.number().int(),
  }),
  streakDays: z.number().int(),
  bestStreak: z.number().int(),
})

const rarityEnum = z.enum(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'])
const variantEnum = z.enum(['NORMAL', 'BRILLIANT', 'HOLOGRAPHIC'])

export const featuredCardDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  rarity: rarityEnum,
  variant: variantEnum,
  setId: z.string(),
  setName: z.string(),
})

export const featuredCardsResponseSchema = z.object({
  cards: z.array(featuredCardDtoSchema),
})

export const setProgressionDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  short: z.string(),
  hue: z.number().int().min(0).max(360),
  owned: z.number().int().min(0),
  total: z.number().int().min(0),
  percent: z.number().min(0).max(100),
})

export const setsProgressionResponseSchema = z.object({
  sets: z.array(setProgressionDtoSchema),
})

export const setFeaturedCardsBodySchema = z.object({
  cardIds: z.array(z.uuid()).max(5),
})

export const setFeaturedCardsResponseSchema = z.object({
  cardIds: z.array(z.string()),
})

export const updateUsernameBodySchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/),
})

export const updateUsernameResponseSchema = z.object({ username: z.string() })

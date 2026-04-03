import { z } from 'zod/v4'

export const achievementSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
})

export const adminAchievementIdParamSchema = z.object({ id: z.string().uuid() })

export const adminAchievementCreateBodySchema = achievementSchema

export const adminAchievementUpdateBodySchema = achievementSchema.partial()

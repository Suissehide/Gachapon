import { z } from 'zod/v4'

import { AchievementCriterionSchema } from '../../../../domain/achievements/criterion.types'

export const achievementSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  criterion: AchievementCriterionSchema,
  family: z.string().nullish(),
  tier: z.number().int().optional(),
  hidden: z.boolean().optional(),
  iconKey: z.string().nullish(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  rewardId: z.string().uuid().nullish(),
})

export const adminAchievementIdParamSchema = z.object({ id: z.string().uuid() })

export const adminAchievementCreateBodySchema = achievementSchema

export const adminAchievementUpdateBodySchema = achievementSchema.partial()

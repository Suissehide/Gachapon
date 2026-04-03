import { z } from 'zod/v4'

export const rewardSchema = z.object({
  tokens: z.number().int().min(0),
  dust: z.number().int().min(0),
  xp: z.number().int().min(0),
})

export const adminStreakDefaultBodySchema = rewardSchema.partial()

export const adminStreakCreateMilestoneBodySchema = rewardSchema.extend({
  day: z.number().int().min(1),
})

export const adminStreakMilestoneParamSchema = z.object({
  id: z.string().uuid(),
})

export const adminStreakUpdateMilestoneBodySchema = rewardSchema.partial()

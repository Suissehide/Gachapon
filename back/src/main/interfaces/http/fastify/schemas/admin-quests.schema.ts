import { z } from 'zod/v4'

export const questSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  criterion: z.record(z.string(), z.unknown()),
  isActive: z.boolean().default(true),
})

export const adminQuestIdParamSchema = z.object({ id: z.string().uuid() })

export const adminQuestCreateBodySchema = questSchema

export const adminQuestUpdateBodySchema = questSchema.partial()

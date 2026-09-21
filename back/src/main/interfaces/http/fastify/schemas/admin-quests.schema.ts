import { z } from 'zod/v4'

export const questSchema = z.object({
  key: z.string().min(1),
  nameFr: z.string().min(1),
  nameEn: z.string().min(1),
  descriptionFr: z.string().min(1),
  descriptionEn: z.string().min(1),
  criterion: z.record(z.string(), z.json()),
  period: z.enum(['ONESHOT', 'WEEKLY']).optional(),
  isActive: z.boolean().default(true),
})

export const adminQuestIdParamSchema = z.object({ id: z.string().uuid() })

export const adminQuestCreateBodySchema = questSchema

export const adminQuestUpdateBodySchema = questSchema.partial()

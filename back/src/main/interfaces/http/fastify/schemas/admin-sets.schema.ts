import { z } from 'zod/v4'

export const adminSetIdParamSchema = z.object({ id: z.string().uuid() })

export const adminSetCreateBodySchema = z.object({
  nameFr: z.string().min(1),
  nameEn: z.string().min(1),
  descriptionFr: z.string().optional(),
  descriptionEn: z.string().optional(),
  isActive: z.boolean().default(false),
})

export const adminSetUpdateBodySchema = z.object({
  nameFr: z.string().min(1).optional(),
  nameEn: z.string().min(1).optional(),
  descriptionFr: z.string().optional(),
  descriptionEn: z.string().optional(),
  isActive: z.boolean().optional(),
})

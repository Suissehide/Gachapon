import { z } from 'zod/v4'

export const adminSetIdParamSchema = z.object({ id: z.string().uuid() })

export const adminSetCreateBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isActive: z.boolean().default(false),
})

export const adminSetUpdateBodySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
})

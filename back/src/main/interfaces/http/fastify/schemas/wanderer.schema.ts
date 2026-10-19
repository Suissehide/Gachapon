import { z } from 'zod/v4'

export const wandererViewSchema = z.object({
  stageId: z.string(),
  chapter: z.number().int(),
  index: z.number().int(),
  stageLabel: z.string(),
  expiresAt: z.string(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  element: z.string().nullable(),
  recommendedPower: z.number(),
})

export const wandererResponseSchema = z.object({
  wanderer: wandererViewSchema.nullable(),
})

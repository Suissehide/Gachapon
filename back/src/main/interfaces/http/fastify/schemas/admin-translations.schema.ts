import { z } from 'zod/v4'

export const missingTranslationEntrySchema = z.object({
  entity: z.string(),
  id: z.string(),
  field: z.string(),
  valueFr: z.string(),
})

export const missingTranslationsResponseSchema = z.object({
  entries: z.array(missingTranslationEntrySchema),
})

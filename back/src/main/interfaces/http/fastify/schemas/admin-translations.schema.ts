import { z } from 'zod/v4'

export const missingTranslationEntrySchema = z.object({
  entity: z.string(),
  id: z.string(),
  field: z.string(),
  // Langue vide, pas une langue présupposée : la détection est
  // bidirectionnelle (voir admin-translations.repository.interface.ts).
  missingLocale: z.enum(['FR', 'EN']),
  value: z.string(),
})

export const missingTranslationsResponseSchema = z.object({
  entries: z.array(missingTranslationEntrySchema),
})

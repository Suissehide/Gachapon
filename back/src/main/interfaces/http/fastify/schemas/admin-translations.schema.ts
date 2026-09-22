import { z } from 'zod/v4'

export const missingTranslationEntrySchema = z.object({
  entity: z.string(),
  id: z.string(),
  field: z.string(),
  // Nature du défaut : une langue vide, ou les deux langues identiques
  // (recopie de la migration / d'un import). Voir
  // admin-translations.repository.interface.ts.
  kind: z.enum(['empty', 'identical']),
  // Langue à remplir, pas une langue présupposée : la détection est
  // bidirectionnelle (voir admin-translations.repository.interface.ts).
  missingLocale: z.enum(['FR', 'EN']),
  value: z.string(),
})

export const missingTranslationsResponseSchema = z.object({
  entries: z.array(missingTranslationEntrySchema),
})

import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

/**
 * Une ligne par paire Fr/En déséquilibrée. `field` est le nom de base
 * (`name`, `description`, `label`) — jamais le nom de colonne littéral,
 * puisque la colonne vide n'est pas toujours l'anglaise. `value` porte le
 * contenu disponible dans l'AUTRE langue que `missingLocale`, pour donner du
 * contexte sans avoir à ouvrir la fiche. Miroir front de
 * `MissingTranslationEntry` (back, `admin-translations.repository.interface.ts`).
 */
export type MissingTranslationEntry = {
  entity: string
  id: string
  field: string
  missingLocale: 'FR' | 'EN'
  value: string
}

export const AdminTranslationsApi = {
  getMissing: async (): Promise<{ entries: MissingTranslationEntry[] }> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/translations/missing`)
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        'Erreur lors de la récupération des traductions manquantes',
      )
    }
    return res.json()
  },
}

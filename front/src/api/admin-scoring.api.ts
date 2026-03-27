import type { ScoringConfig } from '../constants/config.constant.ts'
import { apiUrl, CONFIG_ROUTES } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type { ScoringConfig }

export const AdminScoringApi = {
  getConfig: async (): Promise<ScoringConfig> => {
    const res = await fetchWithAuth(
      `${apiUrl}${CONFIG_ROUTES.admin.scoringConfig}`,
    )
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        'Erreur lors de la récupération de la config de scoring',
      )
    }
    return res.json()
  },

  updateConfig: async (data: ScoringConfig): Promise<ScoringConfig> => {
    const res = await fetchWithAuth(
      `${apiUrl}${CONFIG_ROUTES.admin.scoringConfig}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
    )
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        'Erreur lors de la mise à jour de la config de scoring',
      )
    }
    return res.json()
  },
}

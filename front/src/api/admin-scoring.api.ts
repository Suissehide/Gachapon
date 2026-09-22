import type { ScoringConfig } from '../constants/config.constant.ts'
import { apiUrl, CONFIG_ROUTES } from '../constants/config.constant.ts'
import i18n from '../i18n/index.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type { ScoringConfig }

export const AdminScoringApi = {
  getConfig: async (): Promise<ScoringConfig> => {
    const res = await fetchWithAuth(
      `${apiUrl}${CONFIG_ROUTES.admin.scoringConfig}`,
    )
    if (!res.ok) {
      handleHttpError(res, {}, i18n.t('admin:apiTitles.scoring.load'))
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
      handleHttpError(res, {}, i18n.t('admin:apiTitles.scoring.update'))
    }
    return res.json()
  },
}

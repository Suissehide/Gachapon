import type { AdminConfig } from '../constants/config.constant.ts'
import { apiUrl, CONFIG_ROUTES } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type { AdminConfig }

export const AdminConfigApi = {
  getConfig: async (): Promise<AdminConfig> => {
    const res = await fetchWithAuth(`${apiUrl}${CONFIG_ROUTES.admin.config}`)
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        'Erreur lors de la récupération de la configuration',
      )
    }
    return res.json()
  },

  saveConfig: async (updates: Partial<AdminConfig>): Promise<AdminConfig> => {
    const res = await fetchWithAuth(`${apiUrl}${CONFIG_ROUTES.admin.config}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        'Erreur lors de la sauvegarde de la configuration',
      )
    }
    return res.json()
  },
}

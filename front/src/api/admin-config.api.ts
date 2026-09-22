import type { AdminConfig } from '../constants/config.constant.ts'
import { apiUrl, CONFIG_ROUTES } from '../constants/config.constant.ts'
import i18n from '../i18n/index.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type { AdminConfig }

export const AdminConfigApi = {
  getConfig: async (): Promise<AdminConfig> => {
    const res = await fetchWithAuth(`${apiUrl}${CONFIG_ROUTES.admin.config}`)
    if (!res.ok) {
      handleHttpError(res, {}, i18n.t('admin:apiTitles.config.load'))
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
      handleHttpError(res, {}, i18n.t('admin:apiTitles.config.save'))
    }
    return res.json()
  },
}

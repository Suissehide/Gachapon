import { apiUrl } from '../constants/config.constant.ts'
import type { UpgradeConfigRow } from '../constants/upgrades.constant.ts'
import { UPGRADE_ROUTES } from '../constants/upgrades.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type { UpgradeConfigRow }

export const AdminUpgradesApi = {
  getUpgrades: async (): Promise<UpgradeConfigRow[]> => {
    const res = await fetchWithAuth(`${apiUrl}${UPGRADE_ROUTES.admin.upgrades}`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération')
    }
    return res.json()
  },

  saveUpgrades: async (
    upgrades: UpgradeConfigRow[],
  ): Promise<{ updated: number }> => {
    const res = await fetchWithAuth(
      `${apiUrl}${UPGRADE_ROUTES.admin.upgrades}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upgrades }),
      },
    )
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la sauvegarde')
    }
    return res.json()
  },
}

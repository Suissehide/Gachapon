import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'
import type { UpgradeType } from './upgrades.api.ts'

export type UpgradeConfigRow = {
  type: UpgradeType
  level: number
  effect: number
  dustCost: number
}

export const AdminUpgradesApi = {
  getUpgrades: async (): Promise<UpgradeConfigRow[]> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/upgrades`)
    if (!res.ok) handleHttpError(res, {}, 'Erreur lors de la récupération')
    return res.json()
  },

  saveUpgrades: async (upgrades: UpgradeConfigRow[]): Promise<{ updated: number }> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/upgrades`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upgrades }),
    })
    if (!res.ok) handleHttpError(res, {}, 'Erreur lors de la sauvegarde')
    return res.json()
  },
}

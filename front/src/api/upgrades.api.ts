import { apiUrl } from '../constants/config.constant.ts'
import type {
  BuyUpgradeResult,
  UpgradeStatus,
  UpgradeType,
} from '../constants/upgrades.constant.ts'
import { UPGRADE_ROUTES } from '../constants/upgrades.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type { UpgradeType, UpgradeStatus, BuyUpgradeResult }

export const UpgradesApi = {
  getUpgrades: async (): Promise<UpgradeStatus[]> => {
    const res = await fetchWithAuth(`${apiUrl}${UPGRADE_ROUTES.upgrades}`)
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        'Erreur lors de la récupération des améliorations',
      )
    }
    return res.json()
  },

  buyUpgrade: async (type: UpgradeType): Promise<BuyUpgradeResult> => {
    const res = await fetchWithAuth(`${apiUrl}${UPGRADE_ROUTES.buy(type)}`, {
      method: 'POST',
    })
    if (!res.ok) {
      handleHttpError(res, {}, "Erreur lors de l'achat")
    }
    return res.json()
  },
}

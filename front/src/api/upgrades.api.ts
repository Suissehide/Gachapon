import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type UpgradeType = 'REGEN' | 'LUCK' | 'DUST_HARVEST' | 'TOKEN_VAULT'

export type UpgradeStatus = {
  type: UpgradeType
  currentLevel: number
  currentEffect: number | null
  nextLevel: number | null
  nextEffect: number | null
  nextCost: number | null
  canAfford: boolean
  isMaxed: boolean
}

export type BuyUpgradeResult = {
  type: UpgradeType
  newLevel: number
  effect: number
  newDustTotal: number
}

export const UpgradesApi = {
  getUpgrades: async (): Promise<UpgradeStatus[]> => {
    const res = await fetchWithAuth(`${apiUrl}/upgrades`)
    if (!res.ok) handleHttpError(res, {}, 'Erreur lors de la récupération des améliorations')
    return res.json()
  },

  buyUpgrade: async (type: UpgradeType): Promise<BuyUpgradeResult> => {
    const res = await fetchWithAuth(`${apiUrl}/upgrades/${type}/buy`, { method: 'POST' })
    if (!res.ok) handleHttpError(res, {}, "Erreur lors de l'achat")
    return res.json()
  },
}

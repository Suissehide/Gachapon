import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import type { ReturnChest } from '../stores/auth.store.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type ReturnChestClaim = {
  tokens: number
  combatPoints: number
  gained: ReturnChest
}

export const ReturnBonusApi = {
  claim: async (): Promise<ReturnChestClaim> => {
    const res = await fetchWithAuth(`${apiUrl}/return-bonus/claim`, {
      method: 'POST',
    })
    if (!res.ok) {
      handleHttpError(res)
    }
    return res.json()
  },
}

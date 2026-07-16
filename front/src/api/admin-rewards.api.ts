import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type BulkRewardBody = {
  target: 'ALL' | { userIds: string[] }
  reward: {
    tokens?: number
    dust?: number
    xp?: number
    gold?: number
    cardRarity?: string
  }
  message?: string
}

export const AdminRewardsApi = {
  sendBulk: async (body: BulkRewardBody): Promise<{ count: number }> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/rewards/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      handleHttpError(res, {}, "Erreur lors de l'envoi des récompenses")
    }
    return res.json()
  },
}

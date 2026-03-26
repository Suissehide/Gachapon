import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type PendingReward = {
  id: string
  source: 'STREAK' | 'ACHIEVEMENT' | 'QUEST'
  sourceId: string | null
  createdAt: string
  reward: { tokens: number; dust: number; xp: number }
  streakMilestone: { day: number; isMilestone: boolean } | null
}

export type ClaimResult = {
  tokens: number
  dust: number
  xp: number
  level: number
  pendingRewardsCount: number
}

export const RewardsApi = {
  getPendingRewards: async (): Promise<{ rewards: PendingReward[] }> => {
    const res = await fetchWithAuth(`${apiUrl}/rewards/pending`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération des récompenses')
    }
    return res.json()
  },

  claimReward: async (rewardId: string): Promise<ClaimResult> => {
    const res = await fetchWithAuth(`${apiUrl}/rewards/${rewardId}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la réclamation de la récompense')
    }
    return res.json()
  },

  claimAllRewards: async (): Promise<ClaimResult | null> => {
    const res = await fetchWithAuth(`${apiUrl}/rewards/claim-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la réclamation de toutes les récompenses')
    }
    // 204 No Content means no pending rewards, return null
    if (res.status === 204) {
      return null
    }
    return res.json()
  },
}

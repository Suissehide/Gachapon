import { apiUrl } from '../constants/config.constant.ts'
import type {
  ClaimResult,
  PendingReward,
} from '../constants/rewards.constant.ts'
import { REWARD_ROUTES } from '../constants/rewards.constant.ts'
import i18n from '../i18n/index.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type { PendingReward, ClaimResult }

export const RewardsApi = {
  getPendingRewards: async (): Promise<PendingReward[]> => {
    const res = await fetchWithAuth(`${apiUrl}${REWARD_ROUTES.pending}`)
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        i18n.t('rewards:apiTitles.operations.loadRewards'),
      )
    }
    return res.json()
  },

  claimReward: async (rewardId: string): Promise<ClaimResult> => {
    const res = await fetchWithAuth(
      `${apiUrl}${REWARD_ROUTES.claim(rewardId)}`,
      { method: 'POST' },
    )
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        i18n.t('rewards:apiTitles.operations.claimReward'),
      )
    }
    return res.json()
  },

  claimAllRewards: async (): Promise<ClaimResult | null> => {
    const res = await fetchWithAuth(`${apiUrl}${REWARD_ROUTES.claimAll}`, {
      method: 'POST',
    })
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        i18n.t('rewards:apiTitles.operations.claimAllRewards'),
      )
    }
    // 204 No Content means no pending rewards, return null
    if (res.status === 204) {
      return null
    }
    return res.json()
  },
}

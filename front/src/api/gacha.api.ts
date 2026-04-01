import { apiUrl } from '../constants/config.constant.ts'
import type {
  PullHistory,
  PullResult,
  TokenBalance,
} from '../constants/gacha.constant.ts'
import { GACHA_ROUTES } from '../constants/gacha.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import type { FeedEntry } from '../types/feed'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type { PullResult, TokenBalance, PullHistory }

export const GachaApi = {
  getTokenBalance: async (): Promise<TokenBalance> => {
    const res = await fetchWithAuth(`${apiUrl}${GACHA_ROUTES.tokenBalance}`)
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        'Erreur lors de la récupération du solde de tokens',
      )
    }
    return res.json()
  },

  pull: async (): Promise<PullResult> => {
    const res = await fetchWithAuth(`${apiUrl}${GACHA_ROUTES.pull}`, {
      method: 'POST',
    })
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors du tirage')
    }
    return res.json()
  },

  getPullHistory: async (page: number): Promise<PullHistory> => {
    const res = await fetchWithAuth(`${apiUrl}${GACHA_ROUTES.history(page)}`)
    if (!res.ok) {
      handleHttpError(res, {}, "Erreur lors de la récupération de l'historique")
    }
    return res.json()
  },

  getRecentPulls: async (opts?: {
    limit?: number
    before?: string
    teamId?: string
  }): Promise<{ entries: FeedEntry[]; hasMore: boolean }> => {
    const res = await fetchWithAuth(`${apiUrl}${GACHA_ROUTES.recent(opts)}`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors du chargement du fil')
    }
    return res.json()
  },
}

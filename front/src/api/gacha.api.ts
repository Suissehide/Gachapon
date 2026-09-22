import { apiUrl } from '../constants/config.constant.ts'
import type {
  DropRate,
  PullBatchEntry,
  PullBatchResult,
  PullHistory,
  PullResult,
  TokenBalance,
} from '../constants/gacha.constant.ts'
import { GACHA_ROUTES } from '../constants/gacha.constant.ts'
import i18n from '../i18n/index.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import type { FeedEntry } from '../types/feed'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type {
  DropRate,
  PullResult,
  TokenBalance,
  PullHistory,
  PullBatchResult,
  PullBatchEntry,
}

export const GachaApi = {
  getTokenBalance: async (): Promise<TokenBalance> => {
    const res = await fetchWithAuth(`${apiUrl}${GACHA_ROUTES.tokenBalance}`)
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        i18n.t('gacha:apiTitles.operations.loadTokenBalance'),
      )
    }
    return res.json()
  },

  pull: async (): Promise<PullResult> => {
    const res = await fetchWithAuth(`${apiUrl}${GACHA_ROUTES.pull}`, {
      method: 'POST',
    })
    if (!res.ok) {
      handleHttpError(res, {}, i18n.t('gacha:apiTitles.operations.pull'))
    }
    return res.json()
  },

  getPullHistory: async (page: number): Promise<PullHistory> => {
    const res = await fetchWithAuth(`${apiUrl}${GACHA_ROUTES.history(page)}`)
    if (!res.ok) {
      handleHttpError(res, {}, i18n.t('gacha:apiTitles.operations.loadHistory'))
    }
    return res.json()
  },

  pullBatch: async (count: number): Promise<PullBatchResult> => {
    const res = await fetchWithAuth(`${apiUrl}${GACHA_ROUTES.pullBatch}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count }),
    })
    if (!res.ok) {
      handleHttpError(res, {}, i18n.t('gacha:apiTitles.operations.pull'))
    }
    return res.json()
  },

  getRecentPulls: async (opts?: {
    limit?: number
    before?: string
    teamId?: string
    rarities?: string[]
  }): Promise<{ entries: FeedEntry[]; hasMore: boolean }> => {
    const res = await fetchWithAuth(`${apiUrl}${GACHA_ROUTES.recent(opts)}`)
    if (!res.ok) {
      handleHttpError(res, {}, i18n.t('gacha:apiTitles.operations.loadFeed'))
    }
    return res.json()
  },

  getDropRates: async (): Promise<{ rates: DropRate[] }> => {
    const res = await fetchWithAuth(`${apiUrl}${GACHA_ROUTES.rates}`)
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        i18n.t('gacha:apiTitles.operations.loadDropRates'),
      )
    }
    return res.json()
  },
}

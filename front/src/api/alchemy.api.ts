import {
  ALCHEMY_ROUTES,
  type AlchemyBoard,
  type AlchemyFromRarity,
  type AlchemyPick,
  type TransmuteResult,
} from '../constants/alchemy.constant.ts'
import { apiUrl } from '../constants/config.constant.ts'
import i18n from '../i18n/index.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export const AlchemyApi = {
  board: async (): Promise<AlchemyBoard> => {
    const res = await fetchWithAuth(`${apiUrl}${ALCHEMY_ROUTES.board}`)
    if (!res.ok) {
      handleHttpError(res, {}, i18n.t('alchemy:apiTitles.load'))
    }
    return res.json()
  },

  transmute: async (
    fromRarity: AlchemyFromRarity,
    picks: AlchemyPick[],
  ): Promise<TransmuteResult> => {
    const res = await fetchWithAuth(`${apiUrl}${ALCHEMY_ROUTES.transmute}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromRarity, picks }),
    })
    if (!res.ok) {
      handleHttpError(res, {}, i18n.t('alchemy:apiTitles.transmute'))
    }
    return res.json()
  },
}

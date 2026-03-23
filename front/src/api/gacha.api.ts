import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type PullResult = {
  card: {
    id: string
    name: string
    imageUrl: string | null
    rarity: string
    variant: string | null
    set: { id: string; name: string }
  }
  wasDuplicate: boolean
  dustEarned: number
  tokensRemaining: number
  pityCurrent: number
}

export type TokenBalance = {
  tokens: number
  maxStock: number
  nextTokenAt: string | null
}

export type PullHistory = {
  pulls: Array<{
    id: string
    pulledAt: string
    wasDuplicate: boolean
    dustEarned: number
    card: {
      id: string
      name: string
      imageUrl: string | null
      rarity: string
      variant: string | null
    }
  }>
  total: number
  page: number
  limit: number
}

export const GachaApi = {
  getTokenBalance: async (): Promise<TokenBalance> => {
    const res = await fetchWithAuth(`${apiUrl}/tokens/balance`)
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
    const res = await fetchWithAuth(`${apiUrl}/pulls`, {
      method: 'POST',
    })
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors du tirage')
    }
    return res.json()
  },

  getPullHistory: async (page: number): Promise<PullHistory> => {
    const res = await fetchWithAuth(`${apiUrl}/pulls/history?page=${page}`)
    if (!res.ok) {
      handleHttpError(res, {}, "Erreur lors de la récupération de l'historique")
    }
    return res.json()
  },
}

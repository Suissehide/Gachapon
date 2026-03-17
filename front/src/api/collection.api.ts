import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type CardSet = {
  id: string
  name: string
  description: string | null
  coverImage: string | null
  isActive: boolean
}

export type Card = {
  id: string
  name: string
  imageUrl: string
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
  variant: 'BRILLIANT' | 'HOLOGRAPHIC' | null
  set: { id: string; name: string }
}

export type UserCard = {
  card: Card
  quantity: number
  obtainedAt: string
}

export const CollectionApi = {
  getSets: async (): Promise<{ sets: CardSet[] }> => {
    const res = await fetchWithAuth(`${apiUrl}/sets`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération des sets')
    }
    return res.json()
  },

  getCards: async (filter?: {
    setId?: string
    rarity?: string
  }): Promise<{ cards: Card[] }> => {
    const params = new URLSearchParams()
    if (filter?.setId) {
      params.set('setId', filter.setId)
    }
    if (filter?.rarity) {
      params.set('rarity', filter.rarity)
    }
    const qs = params.toString()
    const res = await fetchWithAuth(`${apiUrl}/cards${qs ? `?${qs}` : ''}`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération des cartes')
    }
    return res.json()
  },

  getUserCollection: async (userId: string): Promise<{ cards: UserCard[] }> => {
    const res = await fetchWithAuth(`${apiUrl}/users/${userId}/collection`)
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        'Erreur lors de la récupération de la collection',
      )
    }
    return res.json()
  },

  recycle: async (
    cardId: string,
  ): Promise<{ dustEarned: number; newDustTotal: number }> => {
    const res = await fetchWithAuth(`${apiUrl}/collection/recycle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId }),
    })
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors du recyclage')
    }
    return res.json()
  },
}

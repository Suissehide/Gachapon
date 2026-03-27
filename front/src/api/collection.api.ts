import type {
  Card,
  CardSet,
  CardVariant,
  UserCard,
} from '../constants/card.constant.ts'
import { CARD_ROUTES } from '../constants/card.constant.ts'
import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type { CardSet, CardVariant, Card, UserCard }

export const CollectionApi = {
  getSets: async (): Promise<{ sets: CardSet[] }> => {
    const res = await fetchWithAuth(`${apiUrl}${CARD_ROUTES.sets}`)
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
    const res = await fetchWithAuth(
      `${apiUrl}${CARD_ROUTES.cards}${qs ? `?${qs}` : ''}`,
    )
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération des cartes')
    }
    return res.json()
  },

  getUserCollection: async (userId: string): Promise<{ cards: UserCard[] }> => {
    const res = await fetchWithAuth(
      `${apiUrl}${CARD_ROUTES.collection(userId)}`,
    )
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
    quantity: number,
    variant: CardVariant,
  ): Promise<{ dustEarned: number; newDustTotal: number }> => {
    const res = await fetchWithAuth(`${apiUrl}${CARD_ROUTES.recycle}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId, quantity, variant }),
    })
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors du recyclage')
    }
    return res.json()
  },
}

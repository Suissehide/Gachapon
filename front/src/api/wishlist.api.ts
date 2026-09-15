import type { Card } from '../constants/card.constant.ts'
import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type WishlistCard = Card & {
  /** Prix en poussière, plein tarif : le vœu échappe à la remise de boutique. */
  price: number
}

export type WishlistResponse = {
  /** Emplacements disponibles : 2 de base, jusqu'à 5 avec « Collectionneur ». */
  slots: number
  cards: WishlistCard[]
}

export type WishlistPurchaseResult = {
  card: WishlistCard
  wasDuplicate: boolean
  dustSpent: number
  newDustBalance: number
}

export const WishlistApi = {
  get: async (): Promise<WishlistResponse> => {
    const res = await fetchWithAuth(`${apiUrl}/wishlist`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération des vœux')
    }
    return res.json()
  },

  add: async (cardId: string): Promise<void> => {
    const res = await fetchWithAuth(`${apiUrl}/wishlist/${cardId}`, {
      method: 'PUT',
    })
    if (!res.ok) {
      handleHttpError(
        res,
        {
          409: {
            title: 'Vœux au complet',
            message:
              'Retire un vœu ou investis dans « Collectionneur » pour en ajouter un.',
          },
        },
        "Erreur lors de l'ajout du vœu",
      )
    }
  },

  remove: async (cardId: string): Promise<void> => {
    const res = await fetchWithAuth(`${apiUrl}/wishlist/${cardId}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors du retrait du vœu')
    }
  },

  purchase: async (cardId: string): Promise<WishlistPurchaseResult> => {
    const res = await fetchWithAuth(`${apiUrl}/wishlist/${cardId}/purchase`, {
      method: 'POST',
    })
    if (!res.ok) {
      handleHttpError(
        res,
        {
          402: {
            title: 'Poussière insuffisante',
            message: "Tu n'as pas assez de poussière pour acheter ce vœu.",
          },
        },
        "Erreur lors de l'achat du vœu",
      )
    }
    return res.json()
  },
}

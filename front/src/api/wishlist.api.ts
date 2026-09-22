import type { Card } from '../constants/card.constant.ts'
import { apiUrl } from '../constants/config.constant.ts'
import i18n from '../i18n/index.ts'
import {
  handleHttpError,
  handleHttpErrorFromServer,
} from '../libs/httpErrorHandler.ts'
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
      handleHttpError(
        res,
        {},
        i18n.t('wishlist:apiTitles.operations.loadWishlist'),
      )
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
            title: i18n.t('wishlist:apiTitles.wishlistFullTitle'),
            message: i18n.t('wishlist:apiTitles.wishlistFullMessage'),
          },
        },
        i18n.t('wishlist:apiTitles.operations.addWish'),
      )
    }
  },

  remove: async (cardId: string): Promise<void> => {
    const res = await fetchWithAuth(`${apiUrl}/wishlist/${cardId}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        i18n.t('wishlist:apiTitles.operations.removeWish'),
      )
    }
  },

  purchase: async (cardId: string): Promise<WishlistPurchaseResult> => {
    const res = await fetchWithAuth(`${apiUrl}/wishlist/${cardId}/purchase`, {
      method: 'POST',
    })
    if (!res.ok) {
      // 402 : `economy.notEnoughDust` du catalogue back, seule source de ce
      // statut. Le 409 juste au-dessus reste au front, lui : le serveur dit
      // « Wishlist pleine », le front dit COMMENT faire de la place.
      await handleHttpErrorFromServer(
        res,
        { 402: i18n.t('wishlist:apiTitles.notEnoughDustTitle') },
        i18n.t('wishlist:toasts.purchaseErrorTitle'),
      )
    }
    return res.json()
  },
}

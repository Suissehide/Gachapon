import type { Card } from '../constants/card.constant.ts'
import { apiUrl } from '../constants/config.constant.ts'
import { ApiError, handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type WishlistResponse = {
  card: Card | null
  price: number | null
  /** null = purchasable now (if card is defined); ISO string = on cooldown until that date */
  availableAt: string | null
  cooldownDays: number
}

export type WishlistPurchaseResult = {
  card: Card
  wasDuplicate: boolean
  dustSpent: number
  newDustBalance: number
  /** ISO string: next available purchase date */
  availableAt: string
}

export class CooldownError extends ApiError {
  availableAt: string | undefined
  constructor(availableAt?: string) {
    super(429, 'Cooldown actif', {
      title: 'Cooldown actif',
      message: availableAt
        ? `Ce vœu sera de nouveau disponible le ${new Date(availableAt).toLocaleDateString('fr-FR')}.`
        : 'Ce vœu est en cooldown. Réessaie plus tard.',
    })
    this.availableAt = availableAt
  }
}

export const WishlistApi = {
  get: async (): Promise<WishlistResponse> => {
    const res = await fetchWithAuth(`${apiUrl}/wishlist`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération du vœu')
    }
    return res.json()
  },

  set: async (cardId: string): Promise<void> => {
    const res = await fetchWithAuth(`${apiUrl}/wishlist`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId }),
    })
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la définition du vœu')
    }
  },

  purchase: async (): Promise<WishlistPurchaseResult> => {
    const res = await fetchWithAuth(`${apiUrl}/wishlist/purchase`, {
      method: 'POST',
    })
    if (!res.ok) {
      if (res.status === 429) {
        const body = await res.json().catch(() => ({}))
        throw new CooldownError(body?.availableAt)
      }
      handleHttpError(res, {
        402: {
          title: 'Poussière insuffisante',
          message: "Tu n'as pas assez de poussière pour acheter ce vœu.",
        },
      }, "Erreur lors de l'achat du vœu")
    }
    return res.json()
  },
}

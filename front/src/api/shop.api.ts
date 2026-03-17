import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type ShopItem = {
  id: string
  name: string
  description: string
  type: 'TOKEN_PACK' | 'BOOST' | 'COSMETIC'
  dustCost: number
  value: unknown
}

export type PurchaseResult = {
  purchaseId: string
  dustSpent: number
  newDustTotal: number
  item: { id: string; name: string; type: string; value: unknown }
}

export const ShopApi = {
  getItems: async (): Promise<{ items: ShopItem[] }> => {
    const res = await fetchWithAuth(`${apiUrl}/shop`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération des articles')
    }
    return res.json()
  },

  buyItem: async (itemId: string): Promise<PurchaseResult> => {
    const res = await fetchWithAuth(`${apiUrl}/shop/${itemId}/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      handleHttpError(res, {}, "Erreur lors de l'achat")
    }
    return res.json()
  },
}

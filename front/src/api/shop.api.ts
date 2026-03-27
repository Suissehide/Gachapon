import { apiUrl } from '../constants/config.constant.ts'
import type { PurchaseResult, ShopItem } from '../constants/shop.constant.ts'
import { SHOP_ROUTES } from '../constants/shop.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type { ShopItem, PurchaseResult }

export const ShopApi = {
  getItems: async (): Promise<{ items: ShopItem[] }> => {
    const res = await fetchWithAuth(`${apiUrl}${SHOP_ROUTES.items}`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération des articles')
    }
    return res.json()
  },

  buyItem: async (itemId: string): Promise<PurchaseResult> => {
    const res = await fetchWithAuth(`${apiUrl}${SHOP_ROUTES.buy(itemId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      handleHttpError(res, {}, "Erreur lors de l'achat")
    }
    return res.json()
  },
}

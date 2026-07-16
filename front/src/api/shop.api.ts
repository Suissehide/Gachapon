import { apiUrl } from '../constants/config.constant.ts'
import type { PurchaseResult, ShopItem } from '../constants/shop.constant.ts'
import { SHOP_ROUTES } from '../constants/shop.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type { ShopItem, PurchaseResult }

export const ShopApi = {
  getItems: async (): Promise<{
    items: ShopItem[]
    energyDaily: { cap: number; used: number }
  }> => {
    const res = await fetchWithAuth(`${apiUrl}${SHOP_ROUTES.items}`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération des articles')
    }
    return res.json()
  },

  buyItem: async (itemId: string): Promise<PurchaseResult> => {
    const res = await fetchWithAuth(`${apiUrl}${SHOP_ROUTES.buy(itemId)}`, {
      method: 'POST',
    })
    if (!res.ok) {
      handleHttpError(
        res,
        {
          409: {
            title: 'Boost déjà actif',
            message: 'Un boost de ce type est déjà actif',
          },
          429: {
            title: 'Limite atteinte',
            message: "Limite quotidienne d'achats d'énergie atteinte",
          },
        },
        "Erreur lors de l'achat",
      )
    }
    return res.json()
  },

  getOwnedMachines: async (): Promise<{ machineIds: string[] }> => {
    const res = await fetchWithAuth(`${apiUrl}/shop/machines`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération des machines')
    }
    return res.json()
  },
}

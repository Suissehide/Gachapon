import { apiUrl } from '../constants/config.constant.ts'
import type { BuyDailyShopResult, DailyShopResponse } from '../constants/daily-shop.constant.ts'
import { DAILY_SHOP_ROUTES } from '../constants/daily-shop.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export const DailyShopApi = {
  get: async (): Promise<DailyShopResponse> => {
    const res = await fetchWithAuth(`${apiUrl}${DAILY_SHOP_ROUTES.shop}`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération de la boutique du jour')
    }
    return res.json()
  },

  buyItem: async (itemId: string): Promise<BuyDailyShopResult> => {
    const res = await fetchWithAuth(`${apiUrl}${DAILY_SHOP_ROUTES.buy(itemId)}`, {
      method: 'POST',
    })
    if (!res.ok) {
      handleHttpError(res, {}, "Erreur lors de l'achat")
    }
    return res.json()
  },
}

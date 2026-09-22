import { apiUrl } from '../constants/config.constant.ts'
import type { PurchaseResult, ShopItem } from '../constants/shop.constant.ts'
import { SHOP_ROUTES } from '../constants/shop.constant.ts'
import i18n from '../i18n/index.ts'
import {
  handleHttpError,
  handleHttpErrorFromServer,
} from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type { ShopItem, PurchaseResult }

export const ShopApi = {
  getItems: async (): Promise<{
    items: ShopItem[]
    energyDaily: { cap: number; used: number }
  }> => {
    const res = await fetchWithAuth(`${apiUrl}${SHOP_ROUTES.items}`)
    if (!res.ok) {
      handleHttpError(res, {}, i18n.t('shop:apiTitles.operations.loadItems'))
    }
    return res.json()
  },

  buyItem: async (itemId: string): Promise<PurchaseResult> => {
    const res = await fetchWithAuth(`${apiUrl}${SHOP_ROUTES.buy(itemId)}`, {
      method: 'POST',
    })
    if (!res.ok) {
      // 409 : `shop.boostRarityConflict` du catalogue back, seule source de
      // ce statut. 429 : partagé avec le limiteur de débit GLOBAL, dont le
      // message est anglais — le front garde le sien.
      await handleHttpErrorFromServer(
        res,
        {
          409: i18n.t('shop:apiTitles.boostConflictTitle'),
          429: {
            title: i18n.t('shop:apiTitles.dailyLimitTitle'),
            message: i18n.t('shop:apiTitles.energyDailyCapMessage'),
          },
        },
        i18n.t('shop:apiTitles.operations.purchase'),
      )
    }
    return res.json()
  },

  getOwnedMachines: async (): Promise<{ machineIds: string[] }> => {
    const res = await fetchWithAuth(`${apiUrl}/shop/machines`)
    if (!res.ok) {
      handleHttpError(res, {}, i18n.t('shop:apiTitles.operations.loadMachines'))
    }
    return res.json()
  },
}

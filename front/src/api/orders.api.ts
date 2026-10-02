import { apiUrl } from '../constants/config.constant.ts'
import type {
  DeliveryPick,
  OrderReward,
  OrdersBoard,
} from '../constants/orders.constant.ts'
import { ORDERS_ROUTES } from '../constants/orders.constant.ts'
import i18n from '../i18n/index.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export const OrdersApi = {
  board: async (): Promise<OrdersBoard> => {
    const res = await fetchWithAuth(`${apiUrl}${ORDERS_ROUTES.board}`)
    if (!res.ok) {
      handleHttpError(res, {}, i18n.t('orders:apiTitles.load'))
    }
    return res.json()
  },

  deliver: async (
    orderId: string,
    picks: DeliveryPick[],
  ): Promise<{ reward: OrderReward }> => {
    const res = await fetchWithAuth(
      `${apiUrl}${ORDERS_ROUTES.deliver(orderId)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ picks }),
      },
    )
    if (!res.ok) {
      handleHttpError(res, {}, i18n.t('orders:apiTitles.deliver'))
    }
    return res.json()
  },

  dismiss: async (orderId: string): Promise<{ free: boolean }> => {
    const res = await fetchWithAuth(
      `${apiUrl}${ORDERS_ROUTES.dismiss(orderId)}`,
      {
        method: 'POST',
      },
    )
    if (!res.ok) {
      handleHttpError(res, {}, i18n.t('orders:apiTitles.dismiss'))
    }
    return res.json()
  },
}

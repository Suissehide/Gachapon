import { apiUrl } from '../constants/config.constant.ts'
import type { AdminShopItem } from '../constants/shop.constant.ts'
import { SHOP_ROUTES } from '../constants/shop.constant.ts'
import i18n from '../i18n/index.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type { AdminShopItem }

// `name`/`description` sont des champs calculés côté back (voir
// localized.extension.ts) : ils ne se soumettent jamais, seules les paires
// Fr/En existent en écriture.
export type CreateShopItemInput = Omit<
  AdminShopItem,
  'id' | 'createdAt' | 'name' | 'description'
>
export type UpdateShopItemInput = Partial<CreateShopItemInput>

export const AdminShopApi = {
  getItems: async (): Promise<{ items: AdminShopItem[] }> => {
    const res = await fetchWithAuth(`${apiUrl}${SHOP_ROUTES.admin.items}`)
    if (!res.ok) {
      handleHttpError(res, {}, i18n.t('admin:apiTitles.shop.loadItems'))
    }
    return res.json()
  },

  createItem: async (data: CreateShopItemInput): Promise<unknown> => {
    const res = await fetchWithAuth(`${apiUrl}${SHOP_ROUTES.admin.items}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      handleHttpError(res, {}, i18n.t('admin:toasts.shop.createItemErrorTitle'))
    }
    return res.json()
  },

  updateItem: async (
    id: string,
    data: UpdateShopItemInput,
  ): Promise<unknown> => {
    const res = await fetchWithAuth(`${apiUrl}${SHOP_ROUTES.admin.item(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      handleHttpError(res, {}, i18n.t('admin:toasts.shop.updateItemErrorTitle'))
    }
    return res.json()
  },

  deleteItem: async (id: string): Promise<void> => {
    const res = await fetchWithAuth(`${apiUrl}${SHOP_ROUTES.admin.item(id)}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      handleHttpError(res, {}, i18n.t('admin:toasts.shop.deleteItemErrorTitle'))
    }
  },
}

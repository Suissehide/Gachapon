import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type AdminShopItem = {
  id: string
  name: string
  description: string
  type: string
  dustCost: number
  value: unknown
  isActive: boolean
  createdAt: string
}

export const AdminShopApi = {
  getItems: async (): Promise<{ items: AdminShopItem[] }> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/shop-items`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération des articles')
    }
    return res.json()
  },

  createItem: async (
    data: Omit<AdminShopItem, 'id' | 'createdAt'>,
  ): Promise<unknown> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/shop-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      handleHttpError(res, {}, "Erreur lors de la création de l'article")
    }
    return res.json()
  },

  updateItem: async (
    id: string,
    data: Partial<AdminShopItem>,
  ): Promise<unknown> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/shop-items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      handleHttpError(res, {}, "Erreur lors de la mise à jour de l'article")
    }
    return res.json()
  },

  deleteItem: async (id: string): Promise<void> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/shop-items/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      handleHttpError(res, {}, "Erreur lors de la suppression de l'article")
    }
  },
}

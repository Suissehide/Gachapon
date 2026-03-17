import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type AdminCardSet = {
  id: string
  name: string
  description?: string
  isActive: boolean
  createdAt: string
  _count: { cards: number }
}

export type AdminCard = {
  id: string
  name: string
  imageUrl: string
  rarity: string
  variant?: string
  dropWeight: number
  set: { id: string; name: string }
}

export const AdminCardsApi = {
  getSets: async (): Promise<{ sets: AdminCardSet[] }> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/sets`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération des sets')
    }
    return res.json()
  },

  createSet: async (data: {
    name: string
    description?: string
    isActive: boolean
  }): Promise<unknown> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/sets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la création du set')
    }
    return res.json()
  },

  updateSet: async (
    id: string,
    data: { name?: string; description?: string; isActive?: boolean },
  ): Promise<unknown> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/sets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la mise à jour du set')
    }
    return res.json()
  },

  deleteSet: async (id: string): Promise<void> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/sets/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la suppression du set')
    }
  },

  getCards: async (params?: {
    setId?: string
    rarity?: string
  }): Promise<{ cards: AdminCard[] }> => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => v) as [string, string][],
    )
    const res = await fetchWithAuth(`${apiUrl}/admin/cards?${qs}`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération des cartes')
    }
    return res.json()
  },

  createCard: async (formData: FormData): Promise<unknown> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/cards`, {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la création de la carte')
    }
    return res.json()
  },

  updateCard: async (
    id: string,
    data: { name?: string; rarity?: string; dropWeight?: number },
  ): Promise<unknown> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/cards/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la mise à jour de la carte')
    }
    return res.json()
  },

  deleteCard: async (id: string): Promise<void> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/cards/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la suppression de la carte')
    }
  },
}

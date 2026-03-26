import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type AdminMilestone = {
  id: string
  day: number
  tokens: number
  dust: number
  xp: number
}

export type AdminStreakConfig = {
  default: { tokens: number; dust: number; xp: number } | null
  defaultMilestoneId: string | null
  milestones: AdminMilestone[]
}

export const AdminStreakApi = {
  getConfig: async (): Promise<AdminStreakConfig> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/streak`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération de la config streak')
    }
    return res.json()
  },

  patchDefault: async (data: Partial<{ tokens: number; dust: number; xp: number }>) => {
    const res = await fetchWithAuth(`${apiUrl}/admin/streak/default`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la mise à jour de la récompense par défaut')
    }
    return res.json()
  },

  createMilestone: async (data: { day: number; tokens: number; dust: number; xp: number }) => {
    const res = await fetchWithAuth(`${apiUrl}/admin/streak/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      handleHttpError(res, { 409: 'Un jalon pour ce jour existe déjà.' }, 'Erreur lors de la création du jalon')
    }
    return res.json() as Promise<AdminMilestone>
  },

  patchMilestone: async (id: string, data: Partial<{ tokens: number; dust: number; xp: number }>) => {
    const res = await fetchWithAuth(`${apiUrl}/admin/streak/milestones/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la mise à jour du jalon')
    }
    return res.json() as Promise<AdminMilestone>
  },

  deleteMilestone: async (id: string): Promise<void> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/streak/milestones/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la suppression du jalon')
    }
  },
}

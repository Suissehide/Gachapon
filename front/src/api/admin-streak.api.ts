import { apiUrl } from '../constants/config.constant.ts'
import type {
  AdminMilestone,
  AdminStreakConfig,
} from '../constants/streak.constant.ts'
import { STREAK_ROUTES } from '../constants/streak.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type { AdminMilestone, AdminStreakConfig }

export const AdminStreakApi = {
  getConfig: async (): Promise<AdminStreakConfig> => {
    const response = await fetchWithAuth(`${apiUrl}${STREAK_ROUTES.admin.root}`)
    if (!response.ok) {
      handleHttpError(
        response,
        {},
        'Erreur lors de la récupération de la config streak',
      )
    }
    return response.json()
  },

  patchDefault: async (
    data: Partial<{ tokens: number; dust: number; xp: number }>,
  ) => {
    const response = await fetchWithAuth(
      `${apiUrl}${STREAK_ROUTES.admin.default}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
    )
    if (!response.ok) {
      handleHttpError(
        response,
        {},
        'Erreur lors de la mise à jour de la récompense par défaut',
      )
    }
    return response.json()
  },

  createMilestone: async (data: {
    day: number
    tokens: number
    dust: number
    xp: number
  }) => {
    const response = await fetchWithAuth(
      `${apiUrl}${STREAK_ROUTES.admin.milestones}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
    )
    if (!response.ok) {
      handleHttpError(
        response,
        {
          409: {
            title: 'Jalon déjà existant',
            message: 'Un jalon pour ce jour existe déjà',
          },
        },
        'Erreur lors de la création du jalon',
      )
    }
    return response.json()
  },

  patchMilestone: async (
    id: string,
    data: Partial<{ tokens: number; dust: number; xp: number }>,
  ) => {
    const response = await fetchWithAuth(
      `${apiUrl}${STREAK_ROUTES.admin.milestone(id)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
    )
    if (!response.ok) {
      handleHttpError(response, {}, 'Erreur lors de la mise à jour du jalon')
    }
    return response.json()
  },

  deleteMilestone: async (id: string): Promise<void> => {
    const response = await fetchWithAuth(
      `${apiUrl}${STREAK_ROUTES.admin.milestone(id)}`,
      {
        method: 'DELETE',
      },
    )
    if (!response.ok) {
      handleHttpError(response, {}, 'Erreur lors de la suppression du jalon')
    }
  },
}

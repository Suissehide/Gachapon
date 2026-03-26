import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type UserProfile = {
  id: string
  username: string
  avatar: string | null
  banner: string | null
  level: number
  xp: number
  dust: number
  createdAt: string
  stats: {
    totalPulls: number
    ownedCards: number
    legendaryCount: number
    dustGenerated: number
  }
  streakDays: number
  bestStreak: number
}

export type ApiKey = {
  id: string
  name: string
  lastUsedAt: string | null
  createdAt: string
}

export type ApiKeyCreated = ApiKey & { key: string }

export const ProfileApi = {
  getUserProfile: async (username: string): Promise<UserProfile> => {
    const res = await fetchWithAuth(`${apiUrl}/users/${username}/profile`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération du profil')
    }
    return res.json()
  },

  getApiKeys: async (): Promise<ApiKey[]> => {
    const res = await fetchWithAuth(`${apiUrl}/api-keys`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération des clés API')
    }
    return res.json()
  },

  createApiKey: async (name: string): Promise<ApiKeyCreated> => {
    const res = await fetchWithAuth(`${apiUrl}/api-keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la création de la clé API')
    }
    return res.json()
  },

  deleteApiKey: async (id: string): Promise<void> => {
    const res = await fetchWithAuth(`${apiUrl}/api-keys/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la suppression de la clé API')
    }
  },
}

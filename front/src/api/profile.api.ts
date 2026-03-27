import { apiUrl } from '../constants/config.constant.ts'
import type {
  ApiKey,
  ApiKeyCreated,
  UserProfile,
} from '../constants/profile.constant.ts'
import { PROFILE_ROUTES } from '../constants/profile.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type { UserProfile, ApiKey, ApiKeyCreated }

export const ProfileApi = {
  getUserProfile: async (username: string): Promise<UserProfile> => {
    const res = await fetchWithAuth(
      `${apiUrl}${PROFILE_ROUTES.profile(username)}`,
    )
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération du profil')
    }
    return res.json()
  },

  getApiKeys: async (): Promise<ApiKey[]> => {
    const res = await fetchWithAuth(`${apiUrl}${PROFILE_ROUTES.apiKeys}`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération des clés API')
    }
    return res.json()
  },

  createApiKey: async (name: string): Promise<ApiKeyCreated> => {
    const res = await fetchWithAuth(`${apiUrl}${PROFILE_ROUTES.apiKeys}`, {
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
    const res = await fetchWithAuth(`${apiUrl}${PROFILE_ROUTES.apiKey(id)}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la suppression de la clé API')
    }
  },
}

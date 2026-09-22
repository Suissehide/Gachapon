import { apiUrl } from '../constants/config.constant.ts'
import type {
  ApiKey,
  ApiKeyCreated,
  ApiLocale,
  FeaturedCard,
  SetProgression,
  UserProfile,
} from '../constants/profile.constant.ts'
import { PROFILE_ROUTES } from '../constants/profile.constant.ts'
import i18n from '../i18n/index.ts'
import {
  handleHttpError,
  handleHttpErrorFromServer,
} from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type {
  UserProfile,
  ApiKey,
  ApiKeyCreated,
  ApiLocale,
  FeaturedCard,
  SetProgression,
}

export const ProfileApi = {
  getUserProfile: async (username: string): Promise<UserProfile> => {
    const res = await fetchWithAuth(
      `${apiUrl}${PROFILE_ROUTES.profile(username)}`,
    )
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        i18n.t('profile:apiTitles.operations.loadProfile'),
      )
    }
    return res.json()
  },

  getApiKeys: async (): Promise<ApiKey[]> => {
    const res = await fetchWithAuth(`${apiUrl}${PROFILE_ROUTES.apiKeys}`)
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        i18n.t('profile:apiTitles.operations.loadApiKeys'),
      )
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
      handleHttpError(
        res,
        {},
        i18n.t('profile:apiTitles.operations.createApiKey'),
      )
    }
    return res.json()
  },

  deleteApiKey: async (id: string): Promise<void> => {
    const res = await fetchWithAuth(`${apiUrl}${PROFILE_ROUTES.apiKey(id)}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        i18n.t('profile:apiTitles.operations.deleteApiKey'),
      )
    }
  },

  getFeaturedCards: async (
    username: string,
  ): Promise<{ cards: FeaturedCard[] }> => {
    const res = await fetchWithAuth(
      `${apiUrl}${PROFILE_ROUTES.featuredCards(username)}`,
    )
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        i18n.t('profile:apiTitles.operations.loadFeaturedCards'),
      )
    }
    return res.json()
  },

  getSetsProgression: async (
    username: string,
  ): Promise<{ sets: SetProgression[] }> => {
    const res = await fetchWithAuth(
      `${apiUrl}${PROFILE_ROUTES.setsProgression(username)}`,
    )
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        i18n.t('profile:apiTitles.operations.loadProgress'),
      )
    }
    return res.json()
  },

  setFeaturedCards: async (
    cardIds: string[],
  ): Promise<{ cardIds: string[] }> => {
    const res = await fetchWithAuth(
      `${apiUrl}${PROFILE_ROUTES.mySetFeaturedCards}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds }),
      },
    )
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        i18n.t('profile:apiTitles.operations.saveFeaturedCards'),
      )
    }
    return res.json()
  },

  updateUsername: async (username: string): Promise<{ username: string }> => {
    const res = await fetchWithAuth(`${apiUrl}${PROFILE_ROUTES.myUsername}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    })
    if (!res.ok) {
      // 409 : `user.usernameTaken` du catalogue back, dont la copie
      // française qui vivait ici était le mot pour mot.
      await handleHttpErrorFromServer(
        res,
        { 409: i18n.t('profile:apiTitles.usernameTakenTitle') },
        i18n.t('profile:apiTitles.operations.changeUsername'),
      )
    }
    return res.json()
  },

  updateLocale: async (locale: ApiLocale): Promise<{ locale: ApiLocale }> => {
    const res = await fetchWithAuth(`${apiUrl}${PROFILE_ROUTES.myLocale}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale }),
    })
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        i18n.t('profile:apiTitles.operations.changeLocale'),
      )
    }
    return res.json()
  },
}

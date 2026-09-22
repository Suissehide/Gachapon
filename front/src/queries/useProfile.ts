import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import type { ApiLocale } from '../api/profile.api.ts'
import { ProfileApi } from '../api/profile.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'
import { useToast } from '../hooks/useToast.ts'
import { isApiError } from '../libs/httpErrorHandler.ts'
import { useAuthStore } from '../stores/auth.store.ts'

export type { ApiKey, ApiKeyCreated, UserProfile } from '../api/profile.api.ts'

export const useUserProfile = (username: string) => {
  const query = useQuery({
    queryKey: ['profile', username],
    queryFn: () => ProfileApi.getUserProfile(username),
    enabled: !!username,
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export const useApiKeys = () => {
  const query = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => ProfileApi.getApiKeys(),
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export const useCreateApiKey = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation('profile')
  return useMutation({
    mutationFn: (name: string) => ProfileApi.createApiKey(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] })
      toast({
        title: t('toasts.apiKeyCreatedTitle'),
        severity: TOAST_SEVERITY.SUCCESS,
      })
    },
    onError: (error) => {
      toast({
        title: t('toasts.createErrorTitle'),
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export const useDeleteApiKey = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation('profile')
  return useMutation({
    mutationFn: (id: string) => ProfileApi.deleteApiKey(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: (error) => {
      toast({
        title: t('toasts.deleteErrorTitle'),
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export function useUserFeaturedCards(username: string) {
  return useQuery({
    queryKey: ['profile', username, 'featured-cards'],
    queryFn: () => ProfileApi.getFeaturedCards(username),
  })
}

export function useUserSetsProgression(username: string) {
  return useQuery({
    queryKey: ['profile', username, 'sets-progression'],
    queryFn: () => ProfileApi.getSetsProgression(username),
  })
}

export function useSetFeaturedCardsMutation() {
  const qc = useQueryClient()
  const me = useAuthStore((s) => s.user?.username)
  return useMutation({
    mutationFn: (cardIds: string[]) => ProfileApi.setFeaturedCards(cardIds),
    onSuccess: () => {
      if (me) {
        qc.invalidateQueries({ queryKey: ['profile', me, 'featured-cards'] })
      }
    },
  })
}

export function useUpdateUsernameMutation() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const fetchMe = useAuthStore((s) => s.fetchMe)
  const { toast } = useToast()
  const { t } = useTranslation('profile')
  return useMutation({
    mutationFn: (username: string) => ProfileApi.updateUsername(username),
    onSuccess: async ({ username }) => {
      // Update the auth store first so the destination page renders with the
      // new identity, then navigate. Only AFTER leaving the old profile do we
      // invalidate: while still mounted on /profile/<old>, invalidating would
      // refetch that now-deleted username (404) and reject, blocking the
      // redirect. Post-navigation the old query is inactive, so the default
      // active-only refetch touches just the new username.
      await fetchMe()
      await navigate({ to: '/profile/$username', params: { username } })
      await qc.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: (err) => {
      const info = isApiError(err)
        ? { title: err.title, message: err.message }
        : {
            title: t('toasts.usernameChangeFallbackTitle'),
            message: t('toasts.usernameChangeFallbackMessage'),
          }
      toast({
        title: info.title,
        message: info.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

/**
 * Pas d'invalidation ni de toast ici : appelée uniquement depuis
 * `useLocale().switchTo` (voir `src/i18n/useLocale.ts`), qui enchaîne
 * toujours sur une navigation dure — une éventuelle erreur reste silencieuse
 * côté appelant, jamais bloquante pour la bascule d'affichage.
 */
export function useUpdateLocaleMutation() {
  return useMutation({
    mutationFn: (locale: ApiLocale) => ProfileApi.updateLocale(locale),
  })
}

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { GuestApi, GuestLimitError } from '../api/guest.api.ts'
import { ProfileApi } from '../api/profile.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useToast } from '../hooks/useToast.ts'
import { isApiError } from '../libs/httpErrorHandler.ts'
import { useAuthStore } from '../stores/auth.store.ts'
import { useAuthDialogStore } from '../stores/authDialog.store.ts'

/**
 * « Jouer » de la vitrine : visiteur déjà en session → /play ; sinon crée un
 * invité puis /play. Quota IP atteint → ouvre l'inscription.
 */
export function usePlayAsGuest() {
  const { t } = useTranslation('guest')
  const navigate = useNavigate()
  const { toast } = useToast()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const fetchMe = useAuthStore((s) => s.fetchMe)
  const openRegister = useAuthDialogStore((s) => s.openRegister)

  const mutation = useMutation({
    mutationFn: GuestApi.create,
    onSuccess: async () => {
      await fetchMe()
      await navigate({ to: '/play' })
    },
    onError: (err) => {
      if (err instanceof GuestLimitError) {
        openRegister()
        toast({
          title: t('limit.title'),
          message: t('limit.message'),
          severity: TOAST_SEVERITY.INFO,
        })
        return
      }
      toast({
        title: t('errors.createTitle'),
        message: err.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })

  return {
    play: () =>
      isAuthenticated ? void navigate({ to: '/play' }) : mutation.mutate(),
    isPending: mutation.isPending,
  }
}

export function useGuestUpgrade() {
  const fetchMe = useAuthStore((s) => s.fetchMe)
  return useMutation({
    mutationFn: GuestApi.upgrade,
    onSuccess: () => fetchMe(),
  })
}

/**
 * Changement de pseudo depuis la popup de sauvegarde. Contrairement à
 * `useUpdateUsernameMutation` (profil), ne navigue pas : le joueur reste
 * dans la popup pour finir de sauvegarder sa progression.
 */
export function useGuestRename() {
  const { t } = useTranslation('guest')
  const qc = useQueryClient()
  const { toast } = useToast()
  const fetchMe = useAuthStore((s) => s.fetchMe)
  return useMutation({
    mutationFn: (username: string) => ProfileApi.updateUsername(username),
    onSuccess: async () => {
      await fetchMe()
      await qc.invalidateQueries({ queryKey: ['profile'] })
      toast({
        title: t('saveDialog.usernameSaved'),
        severity: TOAST_SEVERITY.SUCCESS,
      })
    },
    onError: (err) => {
      toast({
        title: isApiError(err) ? err.title : t('saveDialog.usernameErrorTitle'),
        message: err.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

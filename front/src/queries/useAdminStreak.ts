import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import type {
  CreateMilestoneInput,
  RewardPatch,
} from '../api/admin-streak.api.ts'
import { AdminStreakApi } from '../api/admin-streak.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'
import { useToast } from '../hooks/useToast.ts'

export type {
  AdminMilestone,
  AdminStreakConfig,
} from '../api/admin-streak.api.ts'

const QK = ['admin', 'streak'] as const

export function useAdminStreak() {
  const query = useQuery({
    queryKey: QK,
    queryFn: () => AdminStreakApi.getConfig(),
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export function useAdminPatchStreakDefault() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation('admin')
  return useMutation({
    mutationFn: (data: RewardPatch) => AdminStreakApi.patchDefault(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
    onError: (error) => {
      toast({
        title: t('toasts.streak.updateDefaultErrorTitle'),
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export function useAdminCreateMilestone() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation('admin')
  return useMutation({
    mutationFn: (data: CreateMilestoneInput) =>
      AdminStreakApi.createMilestone(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
    onError: (error) => {
      toast({
        title: t('toasts.streak.createMilestoneErrorTitle'),
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export function useAdminPatchMilestone() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation('admin')
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RewardPatch }) =>
      AdminStreakApi.patchMilestone(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
    onError: (error) => {
      toast({
        title: t('toasts.streak.updateMilestoneErrorTitle'),
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export function useAdminDeleteMilestone() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation('admin')
  return useMutation({
    mutationFn: (id: string) => AdminStreakApi.deleteMilestone(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
    onError: (error) => {
      toast({
        title: t('toasts.streak.deleteMilestoneErrorTitle'),
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

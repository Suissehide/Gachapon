import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import {
  AdminRaidApi,
  type RaidBossSpec,
  type RaidTierPatch,
} from '../api/admin-raid.api.ts'
import type { TowerElement } from '../api/tower.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useToast } from '../hooks/useToast.ts'

const BOSSES_KEY = ['admin', 'raid', 'bosses'] as const
const TIERS_KEY = ['admin', 'raid', 'tiers'] as const

export function useAdminRaidBosses() {
  return useQuery({ queryKey: BOSSES_KEY, queryFn: AdminRaidApi.getBosses })
}

export function useAdminRaidTiers() {
  return useQuery({ queryKey: TIERS_KEY, queryFn: AdminRaidApi.getTiers })
}

export function useAdminPatchRaidBoss() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation('admin')
  return useMutation({
    mutationFn: ({
      element,
      data,
    }: {
      element: TowerElement
      data: { nameFr?: string; nameEn?: string; spec?: RaidBossSpec }
    }) => AdminRaidApi.patchBoss(element, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BOSSES_KEY })
      toast({
        title: t('toasts.raid.bossUpdatedTitle'),
        message: '',
        severity: TOAST_SEVERITY.SUCCESS,
      })
    },
    onError: (e: Error) =>
      toast({
        title: t('toasts.raid.failureTitle'),
        message: e.message,
        severity: TOAST_SEVERITY.ERROR,
      }),
  })
}

export function useAdminPatchRaidTier() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation('admin')
  return useMutation({
    mutationFn: ({ pct, data }: { pct: number; data: RaidTierPatch }) =>
      AdminRaidApi.patchTier(pct, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TIERS_KEY })
      toast({
        title: t('toasts.raid.tierUpdatedTitle'),
        message: '',
        severity: TOAST_SEVERITY.SUCCESS,
      })
    },
    onError: (e: Error) =>
      toast({
        title: t('toasts.raid.failureTitle'),
        message: e.message,
        severity: TOAST_SEVERITY.ERROR,
      }),
  })
}

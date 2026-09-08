import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

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
  return useMutation({
    mutationFn: ({
      element,
      data,
    }: {
      element: TowerElement
      data: { name?: string; spec?: RaidBossSpec }
    }) => AdminRaidApi.patchBoss(element, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BOSSES_KEY })
      toast({
        title: 'Boss mis à jour',
        message: '',
        severity: TOAST_SEVERITY.SUCCESS,
      })
    },
    onError: (e: Error) =>
      toast({
        title: 'Échec',
        message: e.message,
        severity: TOAST_SEVERITY.ERROR,
      }),
  })
}

export function useAdminPatchRaidTier() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: ({ pct, data }: { pct: number; data: RaidTierPatch }) =>
      AdminRaidApi.patchTier(pct, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TIERS_KEY })
      toast({
        title: 'Palier mis à jour',
        message: '',
        severity: TOAST_SEVERITY.SUCCESS,
      })
    },
    onError: (e: Error) =>
      toast({
        title: 'Échec',
        message: e.message,
        severity: TOAST_SEVERITY.ERROR,
      }),
  })
}

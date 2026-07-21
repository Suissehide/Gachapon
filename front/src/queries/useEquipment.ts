import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import { EquipmentApi } from '../api/equipment.api'
import { useAuthStore } from '../stores/auth.store.ts'
import { aggregateEquipmentBonuses, type StatBonuses } from '../utils/cardStats'
import { invalidateBattleCache } from './useCampaign.ts'
import { DEFAULT_ECONOMY, useEconomyConfig } from './useEconomyConfig.ts'

const EQUIPMENT_KEY = ['equipment']

export function useEquipmentList() {
  return useQuery({
    queryKey: EQUIPMENT_KEY,
    queryFn: EquipmentApi.list,
  })
}

/**
 * Aggregated flat/percent stat bonuses from every piece equipped on the given
 * card. Recomputes whenever the equipment list is invalidated (equip/unequip),
 * so displayed stats stay in sync with what's equipped.
 */
export function useCardEquipmentBonuses(userCardId: string): StatBonuses {
  const { data } = useEquipmentList()
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  return useMemo(
    () =>
      aggregateEquipmentBonuses(
        data?.items ?? [],
        userCardId,
        economy.equip.levelScale,
      ),
    [data, userCardId, economy.equip.levelScale],
  )
}

export function useEquipItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      userEquipmentId,
      targetUserCardId,
    }: {
      userEquipmentId: string
      targetUserCardId: string
    }) => EquipmentApi.equip(userEquipmentId, targetUserCardId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EQUIPMENT_KEY })
      qc.invalidateQueries({ queryKey: ['collection'] })
      qc.invalidateQueries({ queryKey: ['combat', 'team'] })
      // Equipped stats changed → drop the cached battle replay cache.
      invalidateBattleCache(qc)
    },
  })
}

export function useUnequipItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userEquipmentId: string) =>
      EquipmentApi.unequip(userEquipmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EQUIPMENT_KEY })
      qc.invalidateQueries({ queryKey: ['collection'] })
      qc.invalidateQueries({ queryKey: ['combat', 'team'] })
      // Equipped stats changed → drop the cached battle replay cache.
      invalidateBattleCache(qc)
    },
  })
}

export function useUpgradeItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userEquipmentId: string) =>
      EquipmentApi.upgrade(userEquipmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EQUIPMENT_KEY })
      qc.invalidateQueries({ queryKey: ['collection'] })
      qc.invalidateQueries({ queryKey: ['combat', 'team'] })
      invalidateBattleCache(qc)
      // L'or affiché dans la navbar vient de fetchMe.
      void useAuthStore.getState().fetchMe()
    },
  })
}

export function useSalvageItems() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userEquipmentIds: string[]) =>
      EquipmentApi.salvage(userEquipmentIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EQUIPMENT_KEY })
      void useAuthStore.getState().fetchMe()
    },
  })
}

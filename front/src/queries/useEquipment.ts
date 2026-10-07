import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import { EquipmentApi } from '../api/equipment.api'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useToast } from '../hooks/useToast.ts'
import i18n from '../i18n/index.ts'
import { useAuthStore } from '../stores/auth.store.ts'
import {
  type ActiveSetSummary,
  activeSetsForCard,
  aggregateEquipmentBonuses,
  cardPower,
  cardStuffStats,
  type StatBonuses,
  type StuffStatBonuses,
  statColorVar,
} from '../utils/cardStats'
import { invalidateBattleCache } from './useCampaign.ts'
import { useUserCollection } from './useCollection.ts'
import { DEFAULT_ECONOMY, useEconomyConfig } from './useEconomyConfig.ts'

const EQUIPMENT_KEY = ['equipment']

export function useEquipmentList() {
  return useQuery({
    queryKey: EQUIPMENT_KEY,
    queryFn: EquipmentApi.list,
  })
}

/**
 * Les 4 sets d'équipement (libellés + bonus des deux paliers) — donnée de
 * référence publique, jamais recopiée côté front.
 */
export function useEquipmentSets() {
  return useQuery({
    queryKey: ['equipment', 'sets'],
    queryFn: EquipmentApi.sets,
    staleTime: Number.POSITIVE_INFINITY,
  })
}

/**
 * Couleur de chaque set, indexée par clé. La couleur d'un set est celle de la
 * stat qu'il buffe (règle du handoff) : elle se déduit donc de
 * `GET /equipment/sets`, pas d'une table de teintes recopiée côté front — un
 * set dont le bonus changerait de stat change de couleur tout seul. Partagé
 * par les tuiles de la fiche de carte (`EquipmentSlotsPanel`) et l'atelier
 * (`EquipmentWorkshop`), pour que les deux n'en tiennent pas deux copies.
 */
export function useSetColorByKey(): Map<string, string> {
  const { data } = useEquipmentSets()
  return useMemo(() => {
    const byKey = new Map<string, string>()
    for (const def of data?.sets ?? []) {
      const statKey = Object.keys(def.bonus.bonuses)[0]
      if (statKey !== undefined) {
        byKey.set(def.key, statColorVar(statKey))
      }
    }
    return byKey
  }, [data])
}

/**
 * Bonus PV/ATQ/DEF/VIT d'une carte, sets inclus. Recalculé à chaque
 * invalidation de la liste (équiper/retirer).
 */
export function useCardEquipmentBonuses(userCardId: string): StatBonuses {
  const { data } = useEquipmentList()
  const { data: sets } = useEquipmentSets()
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  return useMemo(
    () =>
      aggregateEquipmentBonuses(
        data?.items ?? [],
        userCardId,
        economy.equip.levelScale,
        sets?.sets ?? [],
      ),
    [data, sets, userCardId, economy.equip.levelScale],
  )
}

/**
 * Stats de stuff finales (critRate, critDmg, armorPen, lifesteal) d'une
 * carte, baseline + équipement + bonus de set inclus. Contrairement à
 * `useCardEquipmentBonuses`, tient compte des sets actifs — c'est là que le
 * joueur voit l'effet d'un palier de set.
 */
export function useCardStuffStats(userCardId: string): StuffStatBonuses {
  const { data } = useEquipmentList()
  const { data: sets } = useEquipmentSets()
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  return useMemo(
    () =>
      cardStuffStats(
        data?.items ?? [],
        userCardId,
        economy.equip.levelScale,
        sets?.sets ?? [],
        {
          critRate: economy.combat.baseCritRate,
          critDmg: economy.combat.baseCritDmg,
          armorPen: economy.combat.baseArmorPen,
          lifesteal: economy.combat.baseLifesteal,
        },
      ),
    [data, sets, userCardId, economy],
  )
}

/**
 * Sets actifs portés par une carte (compte + palier atteint) — pour
 * l'arbitrage du joueur sur la fiche de carte.
 */
export function useActiveSetsForCard(userCardId: string): ActiveSetSummary[] {
  const { data } = useEquipmentList()
  const { data: sets } = useEquipmentSets()
  return useMemo(() => {
    const setKeys = (data?.items ?? [])
      .filter((i) => i.equippedOnId === userCardId)
      .map((i) => i.setKey)
    return activeSetsForCard(setKeys, sets?.sets ?? [])
  }, [data, sets, userCardId])
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
      // ['combat'] entier : couvre les équipes par mode (['combat','team',*])
      // ET l'agrégat (['combat','teams']) que le hub des tours consommera.
      qc.invalidateQueries({ queryKey: ['combat'] })
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
      // ['combat'] entier : couvre les équipes par mode (['combat','team',*])
      // ET l'agrégat (['combat','teams']) que le hub des tours consommera.
      qc.invalidateQueries({ queryKey: ['combat'] })
      // Equipped stats changed → drop the cached battle replay cache.
      invalidateBattleCache(qc)
    },
  })
}

/**
 * Cartes du joueur, les plus puissantes en tête : c'est presque toujours
 * l'une d'elles qu'on stuffe. Même calcul de puissance que la page
 * Collection — équipement déjà porté compris. Sert aux fenêtres
 * « Équiper sur… » et « Échanger l'équipement avec… ».
 */
export function useCardsByPower() {
  const user = useAuthStore((s) => s.user)
  const collection = useUserCollection(user?.id)
  const { data } = useEquipmentList()
  const { data: sets } = useEquipmentSets()
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  return useMemo(() => {
    const cards = collection.data?.cards ?? []
    const items = data?.items ?? []
    // Puissance calculée une fois par carte, pas à chaque comparaison :
    // l'agrégation parcourt tout l'inventaire d'équipement.
    const power = new Map(
      cards.map((uc) => [
        uc.id,
        cardPower(
          uc.card,
          uc.level,
          uc.variant,
          uc.palier,
          aggregateEquipmentBonuses(
            items,
            uc.id,
            economy.equip.levelScale,
            sets?.sets ?? [],
          ),
          economy.card,
        ),
      ]),
    )
    return [...cards].sort(
      (a, b) => (power.get(b.id) ?? 0) - (power.get(a.id) ?? 0),
    )
  }, [
    collection.data?.cards,
    data,
    sets,
    economy.equip.levelScale,
    economy.card,
  ])
}

export function useSwapEquipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      fromUserCardId,
      toUserCardId,
    }: {
      fromUserCardId: string
      toUserCardId: string
    }) => EquipmentApi.swap(fromUserCardId, toUserCardId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EQUIPMENT_KEY })
      qc.invalidateQueries({ queryKey: ['collection'] })
      qc.invalidateQueries({ queryKey: ['combat'] })
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
      // ['combat'] entier : couvre les équipes par mode (['combat','team',*])
      // ET l'agrégat (['combat','teams']) que le hub des tours consommera.
      qc.invalidateQueries({ queryKey: ['combat'] })
      invalidateBattleCache(qc)
      // L'or affiché dans la navbar vient de fetchMe.
      void useAuthStore.getState().fetchMe()
    },
  })
}

export function useSalvageItems() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (userEquipmentIds: string[]) =>
      EquipmentApi.salvage(userEquipmentIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EQUIPMENT_KEY })
      void useAuthStore.getState().fetchMe()
    },
    onError: (error) => {
      toast({
        title: i18n.t('equipment:toasts.destroyErrorTitle'),
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

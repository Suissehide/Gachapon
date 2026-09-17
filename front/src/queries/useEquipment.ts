import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import { EquipmentApi } from '../api/equipment.api'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useToast } from '../hooks/useToast.ts'
import { useAuthStore } from '../stores/auth.store.ts'
import {
  type ActiveSetSummary,
  activeSetsForCard,
  aggregateEquipmentBonuses,
  cardStuffStats,
  computeCardSetBonuses,
  emptyStuffStatBonuses,
  type StatBonuses,
  type StuffStatBonuses,
  withCardSetBonuses,
} from '../utils/cardStats'
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

/**
 * PV/ATQ/DEF/VIT d'une carte, bonus de set (2/4 pièces) inclus — utilisé
 * partout où ces stats sont affichées côte à côte avec `CombatPanel` dans la
 * même fenêtre : `CombatPanel` lui-même et `CardViewModal` (la face de
 * carte, `CardDisplay`, rendue juste au-dessus de `CombatPanel`). Sans ce
 * chemin partagé, les deux blocs afficheraient deux ATQ différentes pour la
 * même carte, visibles simultanément.
 *
 * `useCardEquipmentBonuses` reste inchangé pour ses autres consommateurs —
 * `CollectionCard` (grille de collection) et `TeamEditorPopup`/
 * `collection.tsx` (tri par puissance, badge de puissance) : ces trois-là ne
 * rendent jamais leurs stats à côté de `CombatPanel` (la grille disparaît
 * derrière le fond opaque/flouté de `CardViewModal` dès qu'il s'ouvre ;
 * `TeamEditorPopup` vit sur la route campagne, pas la route collection).
 * L'absence de bonus de set y est donc un écart préexistant, mais jamais vu
 * côte à côte par le joueur — hors périmètre de cette carte.
 */
export function useCardClassicStatsWithSetBonuses(
  userCardId: string,
): StatBonuses {
  const bonuses = useCardEquipmentBonuses(userCardId)
  const { data } = useEquipmentList()
  const { data: sets } = useEquipmentSets()
  return useMemo(() => {
    const equippedSetKeys = (data?.items ?? [])
      .filter((i) => i.equippedOnId === userCardId)
      .map((i) => i.setKey)
    const setBonuses = computeCardSetBonuses(equippedSetKeys, sets?.sets ?? [])
    return withCardSetBonuses(bonuses, setBonuses)
  }, [bonuses, data, sets, userCardId])
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
 * Ce que l'équipement d'une carte lui apporte, en trois parts séparées :
 * les stats classiques des PIÈCES, leurs stats de stuff, et à part les bonus
 * des SETS actifs. La ligne « Apport total » de la fiche les affiche comme
 * des chips distinctes (« VIT +22 » puis « VIT +10 % »), parce que le joueur
 * arbitre justement entre porter une pièce de plus et compléter un set.
 *
 * Aucune baseline n'entre ici : `useCardStuffStats` sert à afficher les
 * stats FINALES d'une carte, celui-ci ne sert qu'à afficher un écart.
 */
export function useCardEquipmentContribution(userCardId: string): {
  classic: StatBonuses
  stuff: StuffStatBonuses
  setBonuses: Record<string, number>
} {
  const { data } = useEquipmentList()
  const { data: sets } = useEquipmentSets()
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  return useMemo(() => {
    const items = data?.items ?? []
    const scale = economy.equip.levelScale
    return {
      classic: aggregateEquipmentBonuses(items, userCardId, scale),
      // Sans définitions de set ni baseline : la part des pièces seules.
      stuff: cardStuffStats(
        items,
        userCardId,
        scale,
        [],
        emptyStuffStatBonuses(),
      ),
      setBonuses: computeCardSetBonuses(
        items.filter((i) => i.equippedOnId === userCardId).map((i) => i.setKey),
        sets?.sets ?? [],
      ),
    }
  }, [data, sets, userCardId, economy.equip.levelScale])
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
        title: 'Erreur lors de la destruction',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { fetchTower, fetchTowers, postTowerBattle } from '../api/tower.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useToast } from '../hooks/useToast.ts'
import { useAuthStore } from '../stores/auth.store.ts'

const TOWERS_KEY = ['tower']

export function useTowers() {
  return useQuery({ queryKey: TOWERS_KEY, queryFn: fetchTowers })
}

export function useTower(element: string) {
  return useQuery({
    queryKey: ['tower', element],
    queryFn: () => fetchTower(element),
    enabled: Boolean(element),
  })
}

type TowerBattleInput = {
  element: string
  floor: number
  userCardIds: string[]
}

export function useTowerBattle() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: ({ element, floor, userCardIds }: TowerBattleInput) =>
      postTowerBattle(element, floor, userCardIds),
    onSuccess: (_res, { element }) => {
      // Progression de la tour (highestFloor a pu avancer).
      queryClient.invalidateQueries({ queryKey: TOWERS_KEY })
      queryClient.invalidateQueries({ queryKey: ['tower', element] })
      // La pièce garantie vient d'apparaître dans l'inventaire.
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
      // Le combat débite les points de combat partagés avec la campagne
      // (clé réelle du hook, voir queries/useCombatPoints.ts).
      queryClient.invalidateQueries({ queryKey: ['combat', 'points'] })
      // Or/poussière/xp/niveau — même clé que les autres mutations qui
      // affectent ces valeurs (dustConvert, gacha, level-up de carte,
      // combat de campagne — voir useCampaign.ts).
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      // Un passage de niveau en tour émet le même événement LEVEL_UP que la
      // campagne, qui alimente à la fois les succès et les quêtes (fan-out
      // dans achievements.domain.ts#track → questsDomain.trackInTx).
      queryClient.invalidateQueries({ queryKey: ['achievements'] })
      queryClient.invalidateQueries({ queryKey: ['quests'] })
      // Or/poussière du topbar viennent du store Zustand, pas d'une query
      // (voir Navbar.tsx) — même motif que useSweepStage dans useCampaign.ts.
      void useAuthStore.getState().fetchMe()
    },
    onError: (e: Error) =>
      toast({
        title: 'Combat impossible',
        message: e.message,
        severity: TOAST_SEVERITY.ERROR,
      }),
  })
}

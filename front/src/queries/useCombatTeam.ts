import type { QueryClient } from '@tanstack/react-query'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { CombatApi } from '../api/combat.api'
import { CAMPAIGN_TEAM_KEY } from '../constants/combatTeam.constant'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useToast } from '../hooks/useToast.ts'
import { invalidateBattleCache } from './useCampaign.ts'

const teamKeyFor = (key: string) => ['combat', 'team', key]
const ALL_TEAMS_KEY = ['combat', 'teams']

/**
 * Une écriture sur la campagne change AUSSI tous les modes qui en héritent —
 * on ne peut pas se contenter d'écrire le cache du mode touché. `['combat',
 * 'team']` (préfixe, sans clé) couvre toutes les entrées par mode d'un coup ;
 * `['combat', 'teams']` ne matche PAS ce préfixe (React Query compare
 * élément par élément — 'team' ≠ 'teams'), d'où l'invalidation séparée. On
 * se garde bien d'invalider tout `['combat']` : ça engloberait aussi
 * `['combat', 'points']`, qui n'a pas bougé ici.
 */
function invalidateAfterWrite(qc: QueryClient, key: string) {
  void qc.invalidateQueries({
    queryKey: key === CAMPAIGN_TEAM_KEY ? ['combat', 'team'] : teamKeyFor(key),
  })
  void qc.invalidateQueries({ queryKey: ALL_TEAMS_KEY })
  // L'équipe vient de changer : tout combat en cache a été livré par
  // l'ancienne, on le jette pour que la navigation suivante en refasse un.
  invalidateBattleCache(qc)
}

export function useCombatTeam(key: string) {
  return useQuery({
    queryKey: teamKeyFor(key),
    queryFn: () => CombatApi.getTeam(key),
  })
}

export function useAllCombatTeams() {
  return useQuery({ queryKey: ALL_TEAMS_KEY, queryFn: CombatApi.getAllTeams })
}

export function useSetCombatTeam(key: string) {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (userCardIds: string[]) => CombatApi.setTeam(key, userCardIds),
    onSuccess: (data) => {
      qc.setQueryData(teamKeyFor(key), data)
      invalidateAfterWrite(qc, key)
    },
    onError: (error) => {
      toast({
        title: "Erreur lors de l'enregistrement de l'équipe",
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export function useClearCombatTeam(key: string) {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: () => CombatApi.clearTeam(key),
    onSuccess: () => invalidateAfterWrite(qc, key),
    onError: (error) => {
      toast({
        title: "Erreur lors du retour à l'équipe de campagne",
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

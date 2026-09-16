import type { QueryClient } from '@tanstack/react-query'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { CombatApi } from '../api/combat.api'
import { CAMPAIGN_TEAM_KEY } from '../constants/combatTeam.constant'
import { invalidateBattleCache } from './useCampaign.ts'

const teamKeyFor = (key: string) => ['combat', 'team', key]
const ALL_TEAMS_KEY = ['combat', 'teams']

/**
 * Une écriture sur la campagne change AUSSI tous les modes qui en héritent —
 * on ne peut pas se contenter d'écrire le cache du mode touché.
 */
function invalidateAfterWrite(qc: QueryClient, key: string) {
  if (key === CAMPAIGN_TEAM_KEY) {
    void qc.invalidateQueries({ queryKey: ['combat'] })
  } else {
    void qc.invalidateQueries({ queryKey: teamKeyFor(key) })
    void qc.invalidateQueries({ queryKey: ALL_TEAMS_KEY })
  }
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
  return useMutation({
    mutationFn: (userCardIds: string[]) => CombatApi.setTeam(key, userCardIds),
    onSuccess: (data) => {
      qc.setQueryData(teamKeyFor(key), data)
      invalidateAfterWrite(qc, key)
    },
  })
}

export function useClearCombatTeam(key: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => CombatApi.clearTeam(key),
    onSuccess: () => invalidateAfterWrite(qc, key),
  })
}

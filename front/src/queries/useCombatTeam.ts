import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { CombatApi } from '../api/combat.api'
import { clearCachedBattles } from './useCampaign.ts'

const COMBAT_TEAM_KEY = ['combat', 'team']

export function useCombatTeam() {
  return useQuery({
    queryKey: COMBAT_TEAM_KEY,
    queryFn: CombatApi.getTeam,
  })
}

export function useSetCombatTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userCardIds: string[]) => CombatApi.setTeam(userCardIds),
    onSuccess: (data) => {
      qc.setQueryData(COMBAT_TEAM_KEY, data)
      // The team just changed, so any battle cached in sessionStorage (keyed
      // only by stageId) was fought with the *old* team. Purge them so the next
      // navigation to /battle/$id fires a fresh battle with the new team rather
      // than replaying the stale one. Also drop react-query's own ['battle',*]
      // entries in case one hasn't been garbage-collected yet.
      clearCachedBattles()
      qc.removeQueries({ queryKey: ['battle'] })
    },
  })
}

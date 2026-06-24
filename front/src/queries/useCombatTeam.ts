import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { CombatApi } from '../api/combat.api'

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
    },
  })
}

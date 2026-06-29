import { useQuery } from '@tanstack/react-query'

import { CombatApi } from '../api/combat.api.ts'

const COMBAT_POINTS_KEY = ['combat', 'points']

export function useCombatPoints() {
  return useQuery({
    queryKey: COMBAT_POINTS_KEY,
    queryFn: CombatApi.getPoints,
    // Refetch every 30s while page is open so countdown stays roughly accurate
    refetchInterval: 30_000,
  })
}

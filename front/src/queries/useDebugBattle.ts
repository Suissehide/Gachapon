import { useMutation } from '@tanstack/react-query'

import { CombatApi } from '../api/combat.api'

export function useDebugBattle() {
  return useMutation({
    mutationFn: CombatApi.debugBattle,
  })
}

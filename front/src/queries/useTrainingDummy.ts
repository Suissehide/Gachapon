import { useQuery } from '@tanstack/react-query'

import { CombatApi, type DummySpec } from '../api/combat.api'
import { pushDummyTry } from '../libs/dummyHistory.ts'
import { useAuthStore } from '../stores/auth.store.ts'

/**
 * Combat contre les mannequins, réglé comme `useFightWanderer` : une seule
 * requête sous StrictMode, jamais relancée par le focus ; `attempt`
 * incrémenté = nouveau combat. Chaque combat est versé à l'historique.
 */
export function useTrainingDummy(dummies: DummySpec[], attempt: number) {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['battle', 'dummy', dummies, attempt],
    queryFn: async () => {
      const result = await CombatApi.fightDummy(dummies)
      if (userId) {
        pushDummyTry(userId, {
          at: Date.now(),
          dummies,
          team: result.teamA.map((u) => u.element ?? null),
          totalDamage: result.damageByDummy.reduce((a, b) => a + b, 0),
          turns: result.turns,
          damageByDummy: result.damageByDummy,
        })
      }
      return result
    },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  })
}

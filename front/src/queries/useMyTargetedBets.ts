import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { WagersApi } from '../api/wagers.api.ts'
import { wsClient } from '../lib/ws.ts'
import { useAuthStore } from '../stores/auth.store.ts'

export const myBetsKey = ['me', 'bets'] as const

/**
 * Les paris en cours placés SUR moi — la source « pari » de la pastille de
 * notification, pendant de `useMyPendingDuels`.
 *
 * Purement informatif : un pari ne se répond pas, la ligne n'a donc ni bouton
 * ni état « lu ». C'est le règlement qui la retire.
 */
export function useMyTargetedBets() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: myBetsKey,
    queryFn: () => WagersApi.getMyTargetedBets(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  })

  // `bet:placed` part déjà vers la cible et elle seule : la notif apparaît
  // sans rechargement. `bet:settled` la retire — c'est la seule sortie, un
  // pari ne s'annule pas.
  useEffect(() => {
    if (!isAuthenticated) {
      return
    }
    return wsClient.on((event) => {
      if (event.type === 'bet:placed' || event.type === 'bet:settled') {
        void queryClient.invalidateQueries({ queryKey: myBetsKey })
      }
    })
  }, [isAuthenticated, queryClient])

  return query
}

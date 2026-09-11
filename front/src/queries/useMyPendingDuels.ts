import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { WagersApi } from '../api/wagers.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useToast } from '../hooks/useToast.ts'
import { wsClient } from '../lib/ws.ts'
import { useAuthStore } from '../stores/auth.store.ts'
import { wagersKey } from './useWagers.ts'

export const myDuelsKey = ['me', 'duels'] as const

/**
 * Les défis en attente de ma réponse, toutes équipes confondues — la source
 * « défi » de la pastille de notification, jumelle de `useMyInvitations`.
 *
 * Une seule requête, et non les trois de `useMyDuel` : la pastille vit dans
 * la navbar, donc sur toutes les pages.
 */
export function useMyPendingDuels() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: myDuelsKey,
    queryFn: () => WagersApi.getMyPendingDuels(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  })

  // `duel:proposed` part déjà vers tous les membres de l'équipe : la notif
  // apparaît sans rechargement. `duel:update` couvre l'acceptation depuis un
  // autre écran. Le refus et l'annulation, eux, n'émettent RIEN côté serveur —
  // un défi annulé par le défieur ne disparaît donc qu'au refetch suivant.
  useEffect(() => {
    if (!isAuthenticated) {
      return
    }
    return wsClient.on((event) => {
      if (event.type === 'duel:proposed' || event.type === 'duel:update') {
        void queryClient.invalidateQueries({ queryKey: myDuelsKey })
      }
    })
  }, [isAuthenticated, queryClient])

  return query
}

type DuelRef = { teamId: string; duelId: string }

/**
 * Accepter / refuser depuis la pastille. Les hooks de `useWagers` figent leur
 * `teamId` à la création ; ici la liste traverse les équipes, l'équipe voyage
 * donc avec chaque défi.
 */
function useRespondToPendingDuel(
  respond: (teamId: string, duelId: string) => Promise<unknown>,
  errorTitle: string,
) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: ({ teamId, duelId }: DuelRef) => respond(teamId, duelId),
    onSuccess: (_data, { teamId }) => {
      void queryClient.invalidateQueries({ queryKey: myDuelsKey })
      void queryClient.invalidateQueries({ queryKey: wagersKey(teamId) })
    },
    onError: (e: Error) =>
      toast({
        title: errorTitle,
        message: e.message,
        severity: TOAST_SEVERITY.ERROR,
      }),
  })
}

export const useAcceptPendingDuel = () =>
  useRespondToPendingDuel(WagersApi.acceptDuel, 'Acceptation impossible')

export const useDeclinePendingDuel = () =>
  useRespondToPendingDuel(WagersApi.declineDuel, 'Refus impossible')

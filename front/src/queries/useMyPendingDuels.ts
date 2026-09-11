import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { WagersApi } from '../api/wagers.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useToast } from '../hooks/useToast.ts'
import { wsClient } from '../lib/ws.ts'
import { useAuthStore } from '../stores/auth.store.ts'
import { wagersKey } from './useWagers.ts'

export const myDuelsKey = ['me', 'duels'] as const
export const duelHandsKey = (teamId: string, duelId: string) =>
  ['duel-hands', teamId, duelId] as const

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
  // apparaît sans rechargement. `duel:update` couvre l'acceptation, le refus
  // et l'annulation ; `duel:settled` fait entrer le résultat dans la pastille
  // à l'instant du règlement — sans attendre la fin de l'animation de tirage,
  // et sans l'interrompre.
  useEffect(() => {
    if (!isAuthenticated) {
      return
    }
    return wsClient.on((event) => {
      if (
        event.type === 'duel:proposed' ||
        event.type === 'duel:update' ||
        event.type === 'duel:settled'
      ) {
        void queryClient.invalidateQueries({ queryKey: myDuelsKey })
      }
    })
  }, [isAuthenticated, queryClient])

  return query
}

/**
 * Les deux mains d'un duel réglé. Requête à la demande : elle n'est tirée que
 * quand le joueur ouvre le résultat, jamais au chargement de la pastille.
 *
 * `staleTime: Infinity` — un duel réglé ne bouge plus, ses mains non plus.
 */
export function useDuelHands(
  teamId: string | undefined,
  duelId: string | undefined,
) {
  return useQuery({
    queryKey: duelHandsKey(teamId ?? '', duelId ?? ''),
    queryFn: () => WagersApi.getDuelHands(teamId as string, duelId as string),
    enabled: Boolean(teamId && duelId),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { WagersApi } from '../api/wagers.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useToast } from '../hooks/useToast.ts'
import { wsClient } from '../lib/ws.ts'
import { useAuthStore } from '../stores/auth.store.ts'

export const wagersKey = (teamId: string) => ['wagers', teamId] as const

export function useWagers(teamId: string | undefined) {
  return useQuery({
    queryKey: wagersKey(teamId ?? ''),
    queryFn: () => WagersApi.getWagers(teamId as string),
    enabled: Boolean(teamId),
    staleTime: 30_000,
    // Aucun événement WS ne part pendant qu'un duel tourne (seulement à sa
    // proposition et à son règlement) alors que chaque tirage re-score le
    // duel actif côté serveur. Sans ce polling, un coéquipier qui regarde
    // le panneau verrait des scores figés jusqu'au prochain événement. Ne
    // pas retirer ce refetchInterval en le prenant pour une redondance du
    // WebSocket.
    refetchInterval: (query) => {
      const data = query.state.data
      return data?.duels.some((duel) => duel.status === 'ACTIVE')
        ? 10_000
        : false
    },
  })
}

export function useProposeDuel(teamId: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (opponentId: string) =>
      WagersApi.proposeDuel(teamId, opponentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wagersKey(teamId) })
    },
    onError: (e: Error) =>
      toast({
        title: 'Proposition impossible',
        message: e.message,
        severity: TOAST_SEVERITY.ERROR,
      }),
  })
}

export function useAcceptDuel(teamId: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (duelId: string) => WagersApi.acceptDuel(teamId, duelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wagersKey(teamId) })
    },
    onError: (e: Error) =>
      toast({
        title: 'Acceptation impossible',
        message: e.message,
        severity: TOAST_SEVERITY.ERROR,
      }),
  })
}

export function useDeclineDuel(teamId: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (duelId: string) => WagersApi.declineDuel(teamId, duelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wagersKey(teamId) })
    },
    onError: (e: Error) =>
      toast({
        title: 'Refus impossible',
        message: e.message,
        severity: TOAST_SEVERITY.ERROR,
      }),
  })
}

export function useCancelDuel(teamId: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (duelId: string) => WagersApi.cancelDuel(teamId, duelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wagersKey(teamId) })
    },
    onError: (e: Error) =>
      toast({
        title: 'Annulation impossible',
        message: e.message,
        severity: TOAST_SEVERITY.ERROR,
      }),
  })
}

/**
 * Invalide la vue des duels à chaque événement WS de l'équipe. À
 * `duel:settled` uniquement, des cartes viennent de changer de main :
 * rafraîchit aussi la collection et le profil (poussière du bandeau).
 */
export function useWagersLive(teamId: string | undefined) {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!teamId) {
      return
    }
    return wsClient.on((event) => {
      if (
        event.type !== 'duel:proposed' &&
        event.type !== 'duel:update' &&
        event.type !== 'duel:settled'
      ) {
        return
      }
      if (event.teamId !== teamId) {
        return
      }
      queryClient.invalidateQueries({ queryKey: wagersKey(teamId) })
      if (event.type === 'duel:settled') {
        queryClient.invalidateQueries({ queryKey: ['collection'] })
        void useAuthStore.getState().fetchMe()
      }
    })
  }, [teamId, queryClient])
}

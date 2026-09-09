import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { WagersApi } from '../api/wagers.api.ts'
import type { CardRarity } from '../constants/card.constant.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useToast } from '../hooks/useToast.ts'
import { wsClient } from '../lib/ws.ts'
import { useAuthStore } from '../stores/auth.store.ts'

/** Ne pas frapper `/bets/quote` à chaque changement de cible ou de rareté. */
const QUOTE_DEBOUNCE_MS = 300

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
 * Devis en direct pour un pari. Temporisé à 300 ms : `targetId` et
 * `minRarity` changent au clic (Select / SegmentedControl), pas frappe par
 * frappe, mais un joueur qui clique vite d'une cible à l'autre ne doit pas
 * déclencher une requête par clic. Désactivé tant que la cible n'est pas
 * choisie — il n'y a alors rien à coter.
 */
export function useBetQuote(
  teamId: string | undefined,
  targetId: string,
  minRarity: CardRarity,
) {
  const [debounced, setDebounced] = useState({ targetId, minRarity })

  useEffect(() => {
    const timer = setTimeout(
      () => setDebounced({ targetId, minRarity }),
      QUOTE_DEBOUNCE_MS,
    )
    return () => clearTimeout(timer)
  }, [targetId, minRarity])

  return useQuery({
    queryKey: [
      'bets',
      'quote',
      teamId,
      debounced.targetId,
      debounced.minRarity,
    ] as const,
    queryFn: () =>
      WagersApi.getQuote(
        teamId as string,
        debounced.targetId,
        debounced.minRarity,
      ),
    enabled: Boolean(teamId) && debounced.targetId !== '',
    staleTime: 5_000,
  })
}

export function usePlaceBet(teamId: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (input: {
      targetId: string
      minRarity: CardRarity
      stake: number
    }) => WagersApi.placeBet(teamId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wagersKey(teamId) })
      // La poussière du bandeau supérieur vient de baisser (mise débitée).
      void useAuthStore.getState().fetchMe()
    },
    onError: (e: Error) =>
      toast({
        title: 'Pari impossible',
        message: e.message,
        severity: TOAST_SEVERITY.ERROR,
      }),
  })
}

/**
 * Invalide la vue des duels et paris à chaque événement WS de l'équipe.
 *
 * À `duel:settled`, des cartes viennent de changer de main : rafraîchit
 * aussi la collection et le profil (poussière du bandeau).
 *
 * À `bet:settled`, aucune carte ne bouge (le pari ne transfère que de la
 * poussière), donc pas d'invalidation de la collection — mais le profil est
 * rafraîchi quand le verdict crédite quelque chose : WON (le gain) et
 * EXPIRED (la mise remboursée). LOST ne change pas le solde du parieur, rien
 * à recharger.
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
        event.type !== 'duel:settled' &&
        event.type !== 'bet:placed' &&
        event.type !== 'bet:settled'
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
      if (
        event.type === 'bet:settled' &&
        (event.status === 'WON' || event.status === 'EXPIRED')
      ) {
        void useAuthStore.getState().fetchMe()
      }
    })
  }, [teamId, queryClient])
}

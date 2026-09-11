import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import type { BetSide } from '../api/wagers.api.ts'
import { WagersApi } from '../api/wagers.api.ts'
import type { CardRarity } from '../constants/card.constant.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useToast } from '../hooks/useToast.ts'
import { wsClient } from '../lib/ws.ts'
import { useAuthStore } from '../stores/auth.store.ts'

/** Ne pas frapper `/bets/quote` à chaque changement de cible ou de rareté. */
const QUOTE_DEBOUNCE_MS = 300

export const wagersKey = (teamId: string) => ['wagers', teamId] as const

export const duelTransfersKey = (teamId: string, duelId: string) =>
  ['wagers', teamId, 'duels', duelId, 'transfers'] as const

/**
 * Les cartes raflées sur un duel réglé, chargées À LA DEMANDE : `enabled`
 * n'est vrai qu'une fois le détail ouvert.
 *
 * `staleTime: Infinity` est correct ici et ne l'est presque jamais ailleurs :
 * un duel réglé est immuable, ses transferts sont écrits une fois dans la
 * transaction de règlement et plus rien ne les touche.
 */
export function useDuelTransfers(teamId: string, duelId: string | null) {
  return useQuery({
    queryKey: duelTransfersKey(teamId, duelId ?? ''),
    queryFn: () => WagersApi.getDuelTransfers(teamId, duelId as string),
    enabled: duelId !== null,
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function useWagers(teamId: string | undefined) {
  return useQuery({
    queryKey: wagersKey(teamId ?? ''),
    queryFn: () => WagersApi.getWagers(teamId as string),
    enabled: Boolean(teamId),
    staleTime: 30_000,
    // Aucun événement WS ne part pendant qu'un duel ou un pari tourne — le
    // serveur ne notifie qu'à la proposition/au placement et au règlement —
    // alors que chaque tirage re-score le duel actif et avance `pullsSeen`
    // sur les paris actifs de sa cible. Sans ce polling, un coéquipier qui
    // regarde le panneau verrait des scores et des compteurs de tirages
    // figés jusqu'au prochain événement (rien ne les rafraîchit sinon : il
    // n'existe pas de `bet:progress`, seulement `bet:placed`/`bet:settled`).
    // Ne pas retirer ce refetchInterval en le prenant pour une redondance
    // du WebSocket.
    refetchInterval: (query) => {
      const data = query.state.data
      const hasActiveDuel = data?.duels.some((duel) => duel.status === 'ACTIVE')
      const hasActiveBet = (data?.bets.length ?? 0) > 0
      return hasActiveDuel || hasActiveBet ? 10_000 : false
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

export function useJoinBet(teamId: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (input: { betId: string; side: BetSide; stake: number }) =>
      WagersApi.joinBet(teamId, input.betId, {
        side: input.side,
        stake: input.stake,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wagersKey(teamId) })
      // La mise sort de la bourse : le solde affiché ailleurs doit suivre.
      void useAuthStore.getState().fetchMe()
    },
    onError: (error) => {
      toast({
        title: 'Renchère refusée',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
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

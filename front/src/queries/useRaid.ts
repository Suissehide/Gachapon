import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { RaidApi, type RaidView } from '../api/raid.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useToast } from '../hooks/useToast.ts'
import { wsClient } from '../lib/ws.ts'
import { useAuthStore } from '../stores/auth.store.ts'

export const raidKey = (teamId: string) => ['raid', teamId] as const

export function useRaid(teamId: string | undefined) {
  return useQuery({
    queryKey: raidKey(teamId ?? ''),
    queryFn: () => RaidApi.getRaid(teamId as string),
    enabled: Boolean(teamId),
    staleTime: 30_000,
  })
}

export function useRaidAttack(teamId: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (userCardIds: string[]) => RaidApi.attack(teamId, userCardIds),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: raidKey(teamId) })
      if (res.newTiers.length > 0) {
        // La pastille Récompenses lit user.pendingRewardsCount (fetchMe),
        // pas la query ['rewards','pending'] : rafraîchir les deux.
        queryClient.invalidateQueries({ queryKey: ['rewards', 'pending'] })
        void useAuthStore.getState().fetchMe()
      }
    },
    onError: (e: Error) =>
      toast({
        title: 'Attaque impossible',
        message: e.message,
        severity: TOAST_SEVERITY.ERROR,
      }),
  })
}

/**
 * Fait bouger la barre de PV en direct quand un coéquipier attaque :
 * patch optimiste du cache puis invalidation (les contributions et paliers
 * viennent du serveur).
 */
export function useRaidLive(teamId: string | undefined) {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!teamId) {
      return
    }
    return wsClient.on((event) => {
      if (event.type !== 'raid:attack' || event.teamId !== teamId) {
        return
      }
      queryClient.setQueryData<RaidView>(raidKey(teamId), (prev) =>
        prev && prev.id === event.raidId
          ? {
              ...prev,
              hp: event.hp,
              damageDone: prev.maxHp - event.hp,
              killedAt: event.killed ? new Date().toISOString() : prev.killedAt,
            }
          : prev,
      )
      queryClient.invalidateQueries({ queryKey: raidKey(teamId) })
    })
  }, [teamId, queryClient])
}

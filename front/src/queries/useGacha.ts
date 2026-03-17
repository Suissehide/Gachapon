import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { GachaApi } from '../api/gacha.api.ts'

export type { PullHistory, PullResult, TokenBalance } from '../api/gacha.api.ts'

export const useTokenBalance = () =>
  useQuery({
    queryKey: ['tokens', 'balance'],
    queryFn: () => GachaApi.getTokenBalance(),
    refetchInterval: 60_000, // rafraîchir toutes les minutes
  })

export const usePull = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => GachaApi.pull(),
    onSuccess: () => {
      // Invalider le solde de tokens après un tirage
      qc.invalidateQueries({ queryKey: ['tokens', 'balance'] })
      qc.invalidateQueries({ queryKey: ['collection'] })
    },
  })
}

export const usePullHistory = (page = 1) =>
  useQuery({
    queryKey: ['pulls', 'history', page],
    queryFn: () => GachaApi.getPullHistory(page),
  })

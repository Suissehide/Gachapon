import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { GachaApi } from '../api/gacha.api.ts'
import { useAuthStore } from '../stores/auth.store.ts'

export type { PullHistory, PullResult, TokenBalance } from '../api/gacha.api.ts'

export const useTokenBalance = () =>
  useQuery({
    queryKey: ['tokens', 'balance'],
    queryFn: () => GachaApi.getTokenBalance(),
    refetchInterval: 60_000, // rafraîchir toutes les minutes
  })

export const usePull = () => {
  const qc = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: () => GachaApi.pull(),
    onSuccess: (result) => {
      // Mettre à jour les tokens et dust dans le store (topbar)
      if (user) {
        setUser({
          ...user,
          tokens: result.tokensRemaining,
          dust: user.dust + result.dustEarned,
        })
      }
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

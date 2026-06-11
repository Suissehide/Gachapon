import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { GachaApi } from '../api/gacha.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'
import { useToast } from '../hooks/useToast.ts'
import { useAchievementUnlockStore } from '../stores/achievementUnlock.store.ts'
import { useAuthStore } from '../stores/auth.store.ts'

export type { PullHistory, PullResult, TokenBalance } from '../api/gacha.api.ts'

export const useTokenBalance = () => {
  const query = useQuery({
    queryKey: ['tokens', 'balance'],
    queryFn: () => GachaApi.getTokenBalance(),
    refetchInterval: 60_000,
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export const usePull = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  const setUser = useAuthStore((s) => s.setUser)
  const user = useAuthStore((s) => s.user)
  const enqueueAchievementUnlock = useAchievementUnlockStore((s) => s.enqueue)
  return useMutation({
    mutationFn: () => GachaApi.pull(),
    onSuccess: (result) => {
      if (user) {
        setUser({
          ...user,
          tokens: result.tokensRemaining,
          dust: user.dust + result.dustEarned,
        })
      }
      qc.invalidateQueries({ queryKey: ['tokens', 'balance'] })
      qc.invalidateQueries({ queryKey: ['collection'] })
      qc.invalidateQueries({ queryKey: ['profile'] })
      if (result.unlockedAchievements?.length) {
        enqueueAchievementUnlock(result.unlockedAchievements)
        qc.invalidateQueries({ queryKey: ['achievements'] })
      }
    },
    onError: (error) => {
      toast({
        title: 'Erreur lors du tirage',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export const usePullHistory = (page = 1) => {
  const query = useQuery({
    queryKey: ['pulls', 'history', page],
    queryFn: () => GachaApi.getPullHistory(page),
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { GachaApi } from '../api/gacha.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'
import { useToast } from '../hooks/useToast.ts'
import { useAchievementUnlockStore } from '../stores/achievementUnlock.store.ts'
import { useAuthStore } from '../stores/auth.store.ts'
import { useLevelUpStore } from '../stores/levelUp.store.ts'
import { computeLevel } from '../utils/level.ts'
import { levelUpReward } from '../utils/levelRewards.ts'
import { DEFAULT_ECONOMY, useEconomyConfig } from './useEconomyConfig.ts'

export type {
  DropRate,
  PullBatchEntry,
  PullBatchResult,
  PullHistory,
  PullResult,
  TokenBalance,
} from '../api/gacha.api.ts'

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
  const username = useAuthStore((s) => s.user?.username ?? '')
  const triggerLevelUp = useLevelUpStore((s) => s.triggerLevelUp)
  const enqueueAchievementUnlock = useAchievementUnlockStore((s) => s.enqueue)
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  return useMutation({
    mutationFn: () => GachaApi.pull(),
    onSuccess: (result) => {
      // Level-up detection
      const cached = qc.getQueryData<{ xp?: number }>(['profile', username])
      const oldXp = cached?.xp ?? 0
      const oldLevel = computeLevel(oldXp, economy.xp)
      const newLevel = computeLevel(oldXp + result.xpGained, economy.xp)
      if (newLevel > oldLevel) {
        triggerLevelUp(newLevel, levelUpReward(oldLevel, newLevel, economy.xp))
      }

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
      // Belt-and-braces: the WebSocket pushes 'feed:pull' to the recent-pulls
      // panel (RecentsPanel) for instant updates, but if the socket is
      // reconnecting or the event is dropped we still want the rare pull to
      // land in the panel — invalidate the query so it refetches from the server.
      qc.invalidateQueries({ queryKey: ['pulls', 'recent'] })
      // Keep active-boost pullsRemaining in sync on the shop page.
      qc.invalidateQueries({ queryKey: ['shop'] })
      qc.invalidateQueries({ queryKey: ['quests'] })
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

export const usePullBatch = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  const setUser = useAuthStore((s) => s.setUser)
  const user = useAuthStore((s) => s.user)
  const username = useAuthStore((s) => s.user?.username ?? '')
  const triggerLevelUp = useLevelUpStore((s) => s.triggerLevelUp)
  const enqueueAchievementUnlock = useAchievementUnlockStore((s) => s.enqueue)
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  return useMutation({
    mutationFn: (count: 1 | 10) => GachaApi.pullBatch(count),
    onSuccess: (result) => {
      const cached = qc.getQueryData<{ xp?: number }>(['profile', username])
      const oldXp = cached?.xp ?? 0
      const oldLevel = computeLevel(oldXp, economy.xp)
      const newLevel = computeLevel(oldXp + result.xpGained, economy.xp)
      if (newLevel > oldLevel) {
        triggerLevelUp(newLevel, levelUpReward(oldLevel, newLevel, economy.xp))
      }
      if (user) {
        setUser({
          ...user,
          tokens: result.tokensRemaining,
          dust: user.dust + result.pulls.reduce((s, p) => s + p.dustEarned, 0),
        })
      }
      qc.invalidateQueries({ queryKey: ['tokens', 'balance'] })
      qc.invalidateQueries({ queryKey: ['collection'] })
      qc.invalidateQueries({ queryKey: ['profile'] })
      qc.invalidateQueries({ queryKey: ['pulls', 'recent'] })
      // Keep active-boost pullsRemaining in sync on the shop page.
      qc.invalidateQueries({ queryKey: ['shop'] })
      qc.invalidateQueries({ queryKey: ['quests'] })
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

export const useDropRates = () => {
  return useQuery({
    queryKey: ['pulls', 'rates'],
    queryFn: () => GachaApi.getDropRates(),
    staleTime: 10 * 60_000,
  })
}

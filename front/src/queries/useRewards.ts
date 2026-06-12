import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { RewardsApi } from '../api/rewards.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'
import { useToast } from '../hooks/useToast.ts'
import { useAchievementUnlockStore } from '../stores/achievementUnlock.store.ts'
import { useAuthStore } from '../stores/auth.store.ts'
import { useLevelUpStore } from '../stores/levelUp.store.ts'
import { computeLevel } from '../utils/level.ts'

export type { ClaimResult, PendingReward } from '../api/rewards.api.ts'

export const usePendingRewards = () => {
  const query = useQuery({
    queryKey: ['rewards', 'pending'],
    queryFn: () => RewardsApi.getPendingRewards(),
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export const useClaimReward = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  const fetchMe = useAuthStore((s) => s.fetchMe)
  const triggerLevelUp = useLevelUpStore((s) => s.triggerLevelUp)
  const username = useAuthStore((s) => s.user?.username ?? '')
  const enqueueAchievementUnlock = useAchievementUnlockStore((s) => s.enqueue)
  return useMutation({
    mutationFn: (rewardId: string) => RewardsApi.claimReward(rewardId),
    onSuccess: (result) => {
      const cached = qc.getQueryData<{ xp?: number }>(['profile', username])
      const oldLevel = computeLevel(cached?.xp ?? 0)
      if (result.level > oldLevel) {
        triggerLevelUp(result.level)
      }
      qc.invalidateQueries({ queryKey: ['rewards', 'pending'] })
      qc.invalidateQueries({ queryKey: ['tokens', 'balance'] })
      void fetchMe()
      if (result.unlockedAchievements?.length) {
        enqueueAchievementUnlock(result.unlockedAchievements)
        qc.invalidateQueries({ queryKey: ['achievements'] })
      }
    },
    onError: (error) => {
      toast({
        title: 'Erreur lors de la réclamation',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export const useClaimAllRewards = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  const fetchMe = useAuthStore((s) => s.fetchMe)
  const triggerLevelUp = useLevelUpStore((s) => s.triggerLevelUp)
  const username = useAuthStore((s) => s.user?.username ?? '')
  const enqueueAchievementUnlock = useAchievementUnlockStore((s) => s.enqueue)
  return useMutation({
    mutationFn: () => RewardsApi.claimAllRewards(),
    onSuccess: (result) => {
      if (result) {
        const cached = qc.getQueryData<{ xp?: number }>(['profile', username])
        const oldLevel = computeLevel(cached?.xp ?? 0)
        if (result.level > oldLevel) {
          triggerLevelUp(result.level)
        }
      }
      qc.invalidateQueries({ queryKey: ['rewards', 'pending'] })
      qc.invalidateQueries({ queryKey: ['tokens', 'balance'] })
      void fetchMe()
      if (result?.unlockedAchievements?.length) {
        enqueueAchievementUnlock(result.unlockedAchievements)
        qc.invalidateQueries({ queryKey: ['achievements'] })
      }
    },
    onError: (error) => {
      toast({
        title: 'Erreur lors de la réclamation',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

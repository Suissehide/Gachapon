import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { RewardsApi } from '../api/rewards.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'
import { useToast } from '../hooks/useToast.ts'
import { useAchievementUnlockStore } from '../stores/achievementUnlock.store.ts'
import { useAuthStore } from '../stores/auth.store.ts'
import { useLevelUpStore } from '../stores/levelUp.store.ts'
import {
  claimedCardToRevealEntry,
  useRewardRevealStore,
} from '../stores/rewardReveal.store.ts'
import { levelUpReward } from '../utils/levelRewards.ts'
import { DEFAULT_ECONOMY, useEconomyConfig } from './useEconomyConfig.ts'

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
  const enqueueAchievementUnlock = useAchievementUnlockStore((s) => s.enqueue)
  const revealRewardCards = useRewardRevealStore((s) => s.reveal)
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  return useMutation({
    mutationFn: (rewardId: string) => RewardsApi.claimReward(rewardId),
    onSuccess: (result) => {
      // Use the server-authoritative levelBefore: computing the old level from
      // the ['profile'] cache is unreliable (that query isn't loaded on the
      // rewards page, so it defaulted to xp 0 → level 1, firing the overlay on
      // every claim for anyone past level 1).
      if (result.level > result.levelBefore) {
        triggerLevelUp(
          result.level,
          levelUpReward(result.levelBefore, result.level, economy.xp),
        )
      }
      qc.invalidateQueries({ queryKey: ['rewards', 'pending'] })
      qc.invalidateQueries({ queryKey: ['quests'] })
      // Progress advances on every claim, not only on unlock — refresh.
      qc.invalidateQueries({ queryKey: ['achievements'] })
      qc.invalidateQueries({ queryKey: ['tokens', 'balance'] })
      qc.invalidateQueries({ queryKey: ['collection'] })
      void fetchMe()
      if (result.unlockedAchievements?.length) {
        enqueueAchievementUnlock(result.unlockedAchievements)
      }
      if (result.cards?.length) {
        revealRewardCards(result.cards.map(claimedCardToRevealEntry))
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
  const enqueueAchievementUnlock = useAchievementUnlockStore((s) => s.enqueue)
  const revealRewardCards = useRewardRevealStore((s) => s.reveal)
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  return useMutation({
    mutationFn: () => RewardsApi.claimAllRewards(),
    onSuccess: (result) => {
      if (result && result.level > result.levelBefore) {
        triggerLevelUp(
          result.level,
          levelUpReward(result.levelBefore, result.level, economy.xp),
        )
      }
      qc.invalidateQueries({ queryKey: ['rewards', 'pending'] })
      qc.invalidateQueries({ queryKey: ['quests'] })
      // Progress advances on every claim, not only on unlock — refresh.
      qc.invalidateQueries({ queryKey: ['achievements'] })
      qc.invalidateQueries({ queryKey: ['tokens', 'balance'] })
      qc.invalidateQueries({ queryKey: ['collection'] })
      void fetchMe()
      if (result?.unlockedAchievements?.length) {
        enqueueAchievementUnlock(result.unlockedAchievements)
      }
      if (result?.cards?.length) {
        revealRewardCards(result.cards.map(claimedCardToRevealEntry))
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

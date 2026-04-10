import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { RewardsApi } from '../api/rewards.api.ts'
import type { ClaimResult, PendingReward } from '../api/rewards.api.ts'
import { useAuthStore } from '../stores/auth.store.ts'

export type { ClaimResult, PendingReward } from '../api/rewards.api.ts'

export const usePendingRewards = () =>
  useQuery({
    queryKey: ['rewards', 'pending'],
    queryFn: () => RewardsApi.getPendingRewards(),
  })

export const useClaimReward = () => {
  const qc = useQueryClient()
  const fetchMe = useAuthStore((s) => s.fetchMe)
  return useMutation({
    mutationFn: (rewardId: string) => RewardsApi.claimReward(rewardId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rewards', 'pending'] })
      qc.invalidateQueries({ queryKey: ['tokens', 'balance'] })
      void fetchMe()
    },
  })
}

export const useClaimAllRewards = () => {
  const qc = useQueryClient()
  const fetchMe = useAuthStore((s) => s.fetchMe)
  return useMutation({
    mutationFn: () => RewardsApi.claimAllRewards(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rewards', 'pending'] })
      qc.invalidateQueries({ queryKey: ['tokens', 'balance'] })
      void fetchMe()
    },
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { RewardsApi } from '../api/rewards.ts'
import type { ClaimResult, PendingReward } from '../api/rewards.ts'

export type { ClaimResult, PendingReward } from '../api/rewards.ts'

export const usePendingRewards = () =>
  useQuery({
    queryKey: ['rewards', 'pending'],
    queryFn: () => RewardsApi.getPendingRewards(),
  })

export const useClaimReward = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (rewardId: string) => RewardsApi.claimReward(rewardId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rewards', 'pending'] })
      qc.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export const useClaimAllRewards = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => RewardsApi.claimAllRewards(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rewards', 'pending'] })
      qc.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

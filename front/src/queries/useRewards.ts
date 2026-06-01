import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { RewardsApi } from '../api/rewards.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'
import { useToast } from '../hooks/useToast.ts'
import { useAuthStore } from '../stores/auth.store.ts'

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
  return useMutation({
    mutationFn: (rewardId: string) => RewardsApi.claimReward(rewardId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rewards', 'pending'] })
      qc.invalidateQueries({ queryKey: ['tokens', 'balance'] })
      void fetchMe()
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
  return useMutation({
    mutationFn: () => RewardsApi.claimAllRewards(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rewards', 'pending'] })
      qc.invalidateQueries({ queryKey: ['tokens', 'balance'] })
      void fetchMe()
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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { CampaignApi } from '../api/campaign.api.ts'

const CAMPAIGN_KEY = ['campaign']

export function useCampaign() {
  return useQuery({
    queryKey: CAMPAIGN_KEY,
    queryFn: CampaignApi.get,
  })
}

export function useAttackStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (stageId: string) => CampaignApi.battle(stageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAMPAIGN_KEY })
      qc.invalidateQueries({ queryKey: ['equipment'] })
      qc.invalidateQueries({ queryKey: ['collection'] })
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

export function useSweepStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ stageId, runs }: { stageId: string; runs: number }) =>
      CampaignApi.sweep(stageId, runs),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAMPAIGN_KEY })
      qc.invalidateQueries({ queryKey: ['equipment'] })
      qc.invalidateQueries({ queryKey: ['collection'] })
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

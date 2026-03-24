import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AdminScoringApi } from '../api/admin-scoring.api.ts'
import type { ScoringConfig } from '../api/admin-scoring.api.ts'

export type { ScoringConfig } from '../api/admin-scoring.api.ts'

export const useScoringConfig = () =>
  useQuery({
    queryKey: ['admin', 'scoringConfig'],
    queryFn: () => AdminScoringApi.getConfig(),
  })

export const useUpdateScoringConfig = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ScoringConfig) => AdminScoringApi.updateConfig(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'scoringConfig'] })
      // Scoring config changes affect leaderboard team scores
      qc.invalidateQueries({ queryKey: ['leaderboard'] })
      qc.invalidateQueries({ queryKey: ['teamRanking'] })
    },
  })
}

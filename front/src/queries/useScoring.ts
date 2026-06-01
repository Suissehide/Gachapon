import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { ScoringConfig } from '../api/admin-scoring.api.ts'
import { AdminScoringApi } from '../api/admin-scoring.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'
import { useToast } from '../hooks/useToast.ts'

export type { ScoringConfig } from '../api/admin-scoring.api.ts'

export const useScoringConfig = () => {
  const query = useQuery({
    queryKey: ['admin', 'scoringConfig'],
    queryFn: () => AdminScoringApi.getConfig(),
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export const useUpdateScoringConfig = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (data: ScoringConfig) => AdminScoringApi.updateConfig(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'scoringConfig'] })
      qc.invalidateQueries({ queryKey: ['leaderboard'] })
      qc.invalidateQueries({ queryKey: ['teamRanking'] })
    },
    onError: (error) => {
      toast({
        title: 'Erreur lors de la mise à jour du scoring',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

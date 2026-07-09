import { useQuery } from '@tanstack/react-query'

import { StatsApi } from '../api/stats.api.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'

export function usePublicStats() {
  const query = useQuery({
    queryKey: ['stats', 'public'],
    queryFn: StatsApi.getPublicStats,
    refetchInterval: 30_000,
    staleTime: 15_000,
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

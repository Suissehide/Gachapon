import { useQuery } from '@tanstack/react-query'

import { AdminStatsApi } from '../api/admin-stats.api.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'

export function useAdminDashboard() {
  const query = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => AdminStatsApi.getDashboard(),
    refetchInterval: 60_000,
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export function useAdminStats() {
  const query = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => AdminStatsApi.getStats(),
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

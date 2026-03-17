import { useQuery } from '@tanstack/react-query'

import { AdminStatsApi } from '../api/admin-stats.api.ts'

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => AdminStatsApi.getDashboard(),
    refetchInterval: 60_000,
  })
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => AdminStatsApi.getStats(),
  })
}

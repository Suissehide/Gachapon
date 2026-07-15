import { useQuery } from '@tanstack/react-query'

import { AdminHealthApi } from '../api/admin-health.api.ts'

export function useAdminHealth() {
  return useQuery({
    queryKey: ['admin', 'health'],
    queryFn: () => AdminHealthApi.getHealth(),
    refetchInterval: 15_000,
  })
}

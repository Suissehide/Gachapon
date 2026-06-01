import { useQuery } from '@tanstack/react-query'

import { StreakApi } from '../api/streak.api.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'

export type { StreakDayEntry, StreakSummary } from '../api/streak.api.ts'

export function useStreakSummary() {
  const query = useQuery({
    queryKey: ['streak', 'summary'],
    queryFn: () => StreakApi.getSummary(),
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

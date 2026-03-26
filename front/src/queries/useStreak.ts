import { useQuery } from '@tanstack/react-query'
import { StreakApi } from '../api/streak.api.ts'

export type { StreakSummary, StreakDayEntry } from '../api/streak.api.ts'

export function useStreakSummary() {
  return useQuery({
    queryKey: ['streak', 'summary'],
    queryFn: () => StreakApi.getSummary(),
  })
}

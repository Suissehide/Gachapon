import { useQuery } from '@tanstack/react-query'

import { AchievementsApi } from '../api/achievements.api.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'

export type { AchievementWithProgress, FamilySummary } from '../api/achievements.api.ts'

export const useAchievements = () => {
  const query = useQuery({
    queryKey: ['achievements', 'list'],
    queryFn: () => AchievementsApi.list(),
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export const useAchievementFamilies = () => {
  const query = useQuery({
    queryKey: ['achievements', 'families'],
    queryFn: () => AchievementsApi.families(),
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

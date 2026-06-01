import { useQuery } from '@tanstack/react-query'

import { LeaderboardApi } from '../api/leaderboard.api.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'

export type {
  CollectorEntry,
  Leaderboard,
  Quest,
  TeamEntry,
} from '../api/leaderboard.api.ts'

export const useLeaderboard = () => {
  const query = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => LeaderboardApi.getLeaderboard(),
    staleTime: 5 * 60 * 1000,
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export const useQuests = () => {
  const query = useQuery({
    queryKey: ['quests'],
    queryFn: () => LeaderboardApi.getQuests(),
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

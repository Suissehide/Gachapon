import { useQuery } from '@tanstack/react-query'

import { LeaderboardApi } from '../api/leaderboard.api.ts'

export type {
  CollectorEntry,
  Leaderboard,
  LegendaryEntry,
  Quest,
  TeamEntry,
} from '../api/leaderboard.api.ts'

export const useLeaderboard = () =>
  useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => LeaderboardApi.getLeaderboard(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

export const useQuests = () =>
  useQuery({
    queryKey: ['quests'],
    queryFn: () => LeaderboardApi.getQuests(),
  })

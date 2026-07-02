import { useQuery } from '@tanstack/react-query'

import { LeaderboardApi } from '../api/leaderboard.api.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'

export type {
  CollectorEntry,
  CombatEntry,
  LeaderboardResponse,
  Quest,
  TeamEntry,
} from '../api/leaderboard.api.ts'

// Cache stays fresh for snappy re-renders during the same session, but every
// page mount also refetches in the background so the data the user sees after
// navigating back is never older than the round-trip.
const STALE = 5 * 60 * 1000
const REFETCH_ON_MOUNT = 'always' as const

export const useCollectorsLeaderboard = () => {
  const query = useQuery({
    queryKey: ['leaderboard', 'collectors'],
    queryFn: LeaderboardApi.getCollectors,
    staleTime: STALE,
    refetchOnMount: REFETCH_ON_MOUNT,
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export const useTeamsLeaderboard = () => {
  const query = useQuery({
    queryKey: ['leaderboard', 'teams'],
    queryFn: LeaderboardApi.getTeams,
    staleTime: STALE,
    refetchOnMount: REFETCH_ON_MOUNT,
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export const useCombatLeaderboard = () => {
  const query = useQuery({
    queryKey: ['leaderboard', 'combat'],
    queryFn: LeaderboardApi.getCombat,
    staleTime: STALE,
    refetchOnMount: REFETCH_ON_MOUNT,
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
    queryFn: LeaderboardApi.getQuests,
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

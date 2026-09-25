import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { LeaderboardApi } from '../api/leaderboard.api.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'

export type {
  CollectorEntry,
  CombatEntry,
  LeaderboardResponse,
  TeamEntry,
} from '../api/leaderboard.api.ts'

// Cache stays fresh for snappy re-renders during the same session, but every
// page mount also refetches in the background so the data the user sees after
// navigating back is never older than the round-trip.
const STALE = 5 * 60 * 1000
const REFETCH_ON_MOUNT = 'always' as const

export const useCollectorsLeaderboard = (page = 1) => {
  const query = useQuery({
    queryKey: ['leaderboard', 'collectors', page],
    queryFn: () => LeaderboardApi.getCollectors(page),
    // Au changement de page, la page précédente reste affichée jusqu'à
    // l'arrivée de la suivante : pas de liste qui s'effondre puis revient.
    placeholderData: keepPreviousData,
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

export const useTeamsLeaderboard = (page = 1) => {
  const query = useQuery({
    queryKey: ['leaderboard', 'teams', page],
    queryFn: () => LeaderboardApi.getTeams(page),
    // Au changement de page, la page précédente reste affichée jusqu'à
    // l'arrivée de la suivante : pas de liste qui s'effondre puis revient.
    placeholderData: keepPreviousData,
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

export const useCombatLeaderboard = (page = 1) => {
  const query = useQuery({
    queryKey: ['leaderboard', 'combat', page],
    queryFn: () => LeaderboardApi.getCombat(page),
    // Au changement de page, la page précédente reste affichée jusqu'à
    // l'arrivée de la suivante : pas de liste qui s'effondre puis revient.
    placeholderData: keepPreviousData,
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

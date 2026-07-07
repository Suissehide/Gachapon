import { useQuery } from '@tanstack/react-query'

import { QuestsApi } from '../api/quests.api.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'

export type {
  QuestEntry,
  QuestReward,
  QuestsResponse,
  WeeklyBonus,
} from '../api/quests.api.ts'

export const useQuests = () => {
  const query = useQuery({
    queryKey: ['quests'],
    queryFn: QuestsApi.get,
    staleTime: 60_000,
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

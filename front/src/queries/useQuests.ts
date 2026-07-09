import { useQuery } from '@tanstack/react-query'

import type { QuestClaim, QuestsResponse } from '../api/quests.api.ts'
import { QuestsApi } from '../api/quests.api.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'

export type {
  QuestClaim,
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

const isClaimable = (claim: QuestClaim | null, completed: boolean) =>
  completed && claim != null && !claim.claimed

/**
 * Nombre de quêtes complétées dont la récompense reste à réclamer.
 * Partage la clé de cache ['quests'] avec `useQuests` (pas de double fetch)
 * mais ne passe pas par `useDataFetching` : monté dans la navbar, il ne doit
 * pas déclencher le spinner/toast global sur chaque page.
 */
export const useClaimableQuestsCount = (): number => {
  const { data } = useQuery({
    queryKey: ['quests'],
    queryFn: QuestsApi.get,
    staleTime: 60_000,
    select: (quests: QuestsResponse) =>
      quests.weekly.filter((q) => isClaimable(q.claim, q.completed)).length +
      quests.oneshot.filter((q) => isClaimable(q.claim, q.completed)).length +
      (isClaimable(quests.weeklyBonus.claim, quests.weeklyBonus.completed)
        ? 1
        : 0),
  })

  return data ?? 0
}

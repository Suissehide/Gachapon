import { useMutation, useQueryClient } from '@tanstack/react-query'

import { CollectionApi } from '../api/collection.api'
import { invalidateBattleCache } from './useCampaign.ts'

export function useLevelUpCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      userCardId,
      targetLevel,
    }: {
      userCardId: string
      targetLevel: number
    }) => CollectionApi.levelUpCard(userCardId, targetLevel),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection'] })
      qc.invalidateQueries({ queryKey: ['profile'] })
      // Stronger card → any cached battle is now stale; drop the replay cache.
      invalidateBattleCache(qc)
    },
  })
}

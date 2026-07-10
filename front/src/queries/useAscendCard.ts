import { useMutation, useQueryClient } from '@tanstack/react-query'

import { CollectionApi } from '../api/collection.api'
import { invalidateBattleCache } from './useCampaign.ts'

export function useAscendCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userCardId }: { userCardId: string }) =>
      CollectionApi.ascendCard(userCardId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection'] })
      qc.invalidateQueries({ queryKey: ['profile'] })
      // Ascended card → any cached battle is now stale; drop the replay cache.
      invalidateBattleCache(qc)
    },
  })
}

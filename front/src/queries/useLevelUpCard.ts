import { useMutation, useQueryClient } from '@tanstack/react-query'

import { CollectionApi } from '../api/collection.api'

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
    },
  })
}

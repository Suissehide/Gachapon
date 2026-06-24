import { useMutation, useQueryClient } from '@tanstack/react-query'

import { CollectionApi } from '../api/collection.api'

export function useAscendCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userCardId }: { userCardId: string }) =>
      CollectionApi.ascendCard(userCardId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection'] })
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

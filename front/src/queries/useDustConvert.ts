import { useMutation, useQueryClient } from '@tanstack/react-query'

import { CollectionApi } from '../api/collection.api'

export function useDustConvert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      userCardId,
      amount,
    }: {
      userCardId: string
      amount: number
    }) => CollectionApi.convertDoublonsToDust(userCardId, amount),
    onSuccess: () => {
      // Refresh collection (quantity changed) and profile (dust changed)
      qc.invalidateQueries({ queryKey: ['collection'] })
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

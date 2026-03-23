import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { CollectionApi } from '../api/collection.api.ts'

export type { Card, CardSet, UserCard } from '../api/collection.api.ts'

export const useCardSets = () =>
  useQuery({
    queryKey: ['sets'],
    queryFn: () => CollectionApi.getSets(),
  })

export const useCards = (filter?: { setId?: string; rarity?: string }) =>
  useQuery({
    queryKey: ['cards', filter],
    queryFn: () => CollectionApi.getCards(filter),
  })

export const useUserCollection = (userId: string | undefined) =>
  useQuery({
    queryKey: ['collection', userId],
    queryFn: () => CollectionApi.getUserCollection(userId ?? ''),
    enabled: !!userId,
  })

export const useRecycle = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ cardId, quantity }: { cardId: string; quantity: number }) =>
      CollectionApi.recycle(cardId, quantity),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection'] })
    },
  })
}

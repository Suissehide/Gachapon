import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { CardVariant, CollectionApi } from '../api/collection.api.ts'
import { useAuthStore } from '../stores/auth.store.ts'

export type { Card, CardSet, CardVariant, UserCard } from '../api/collection.api.ts'

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
  const setUser = useAuthStore((s) => s.setUser)
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: ({ cardId, quantity, variant }: { cardId: string; quantity: number; variant: CardVariant }) =>
      CollectionApi.recycle(cardId, quantity, variant),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['collection'] })
      if (user) {
        setUser({ ...user, dust: data.newDustTotal })
      }
    },
  })
}

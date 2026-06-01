import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { type CardVariant, CollectionApi } from '../api/collection.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'
import { useToast } from '../hooks/useToast.ts'
import { useAuthStore } from '../stores/auth.store.ts'

export type {
  Card,
  CardSet,
  CardVariant,
  UserCard,
} from '../api/collection.api.ts'

export const useCardSets = () => {
  const query = useQuery({
    queryKey: ['sets'],
    queryFn: () => CollectionApi.getSets(),
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export const useCards = (filter?: { setId?: string; rarity?: string }) => {
  const query = useQuery({
    queryKey: ['cards', filter],
    queryFn: () => CollectionApi.getCards(filter),
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export const useUserCollection = (userId: string | undefined) => {
  const query = useQuery({
    queryKey: ['collection', userId],
    queryFn: () => CollectionApi.getUserCollection(userId ?? ''),
    enabled: !!userId,
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export const useRecycle = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  const setUser = useAuthStore((s) => s.setUser)
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: ({
      cardId,
      quantity,
      variant,
    }: {
      cardId: string
      quantity: number
      variant: CardVariant
    }) => CollectionApi.recycle(cardId, quantity, variant),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['collection'] })
      if (user) {
        setUser({ ...user, dust: data.newDustTotal })
      }
    },
    onError: (error) => {
      toast({
        title: 'Erreur lors du recyclage',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

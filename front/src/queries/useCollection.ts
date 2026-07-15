import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { type CardVariant, CollectionApi } from '../api/collection.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'
import { useToast } from '../hooks/useToast.ts'
import { useAchievementUnlockStore } from '../stores/achievementUnlock.store.ts'
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
  const enqueueAchievementUnlock = useAchievementUnlockStore((s) => s.enqueue)
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
      // Recycling fires a CARD_RECYCLED event that also feeds the quest engine
      // (fan-out in achievementsDomain.track) — refresh quest + achievement
      // progress even when nothing unlocks (progress bars advance every time).
      qc.invalidateQueries({ queryKey: ['quests'] })
      qc.invalidateQueries({ queryKey: ['achievements'] })
      if (user) {
        setUser({ ...user, dust: data.newDustTotal })
      }
      if (data.unlockedAchievements?.length) {
        enqueueAchievementUnlock(data.unlockedAchievements)
        // The unlocked achievement mints a pending reward — refresh the badge.
        void useAuthStore.getState().fetchMe()
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

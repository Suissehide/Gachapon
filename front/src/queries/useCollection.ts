import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import {
  type BulkRecycleMaxRarity,
  type CardVariant,
  CollectionApi,
} from '../api/collection.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'
import { useToast } from '../hooks/useToast.ts'
import i18n, { currentLocale } from '../i18n/index.ts'
import { formatNumber } from '../libs/utils.ts'
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
  const { t } = useTranslation('collection')
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
        title: t('recycle.errorTitle'),
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export const useRecycleAll = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation('collection')
  const setUser = useAuthStore((s) => s.setUser)
  const user = useAuthStore((s) => s.user)
  const enqueueAchievementUnlock = useAchievementUnlockStore((s) => s.enqueue)
  return useMutation({
    mutationFn: (maxRarity: BulkRecycleMaxRarity) =>
      CollectionApi.recycleAll(maxRarity),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['collection'] })
      // Même fan-out que useRecycle : CARD_RECYCLED alimente quêtes + succès.
      qc.invalidateQueries({ queryKey: ['quests'] })
      qc.invalidateQueries({ queryKey: ['achievements'] })
      if (user) {
        setUser({ ...user, dust: data.newDustTotal })
      }
      // Les cartes verrouillées par un duel en cours sont ignorées par le
      // serveur plutôt que refusées : sans cette mention, le joueur voit
      // moins de cartes recyclées qu'attendu sans qu'on lui dise pourquoi.
      // Zéro carte ignorée = message strictement identique à avant.
      const skipped = data.skippedEngaged
      const engagedNote =
        skipped > 0
          ? i18n.t('collection:recycleAll.engagedNote', { count: skipped })
          : ''
      const recycled = data.cardsRecycled
      toast({
        title: t('recycleAll.completedTitle'),
        message: t('recycleAll.message', {
          count: recycled,
          dust: formatNumber(data.dustEarned, currentLocale()),
          engagedNote,
        }),
        severity: TOAST_SEVERITY.SUCCESS,
      })
      if (data.unlockedAchievements?.length) {
        enqueueAchievementUnlock(data.unlockedAchievements)
        // Le succès débloqué crée une récompense en attente — rafraîchir la pastille.
        void useAuthStore.getState().fetchMe()
      }
    },
    onError: (error) => {
      toast({
        title: t('recycleAll.errorTitle'),
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

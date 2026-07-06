import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ShopApi } from '../api/shop.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'
import { useToast } from '../hooks/useToast.ts'
import { isApiError } from '../libs/httpErrorHandler.ts'
import { useAchievementUnlockStore } from '../stores/achievementUnlock.store.ts'

export type { PurchaseResult, ShopItem } from '../api/shop.api.ts'

export const useShopItems = () => {
  const query = useQuery({
    queryKey: ['shop'],
    queryFn: () => ShopApi.getItems(),
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export const useBuyItem = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  const enqueueAchievementUnlock = useAchievementUnlockStore((s) => s.enqueue)
  return useMutation({
    mutationFn: (itemId: string) => ShopApi.buyItem(itemId),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['tokens', 'balance'] })
      qc.invalidateQueries({ queryKey: ['shop'] })
      if (result.unlockedAchievements?.length) {
        enqueueAchievementUnlock(result.unlockedAchievements)
        qc.invalidateQueries({ queryKey: ['achievements'] })
      }
    },
    onError: (error) => {
      const title = isApiError(error) && error.title ? error.title : "Erreur lors de l'achat"
      toast({
        title,
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export const useOwnedMachines = () => {
  const query = useQuery({
    queryKey: ['shop', 'machines'],
    queryFn: () => ShopApi.getOwnedMachines(),
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { DailyShopApi } from '../api/dailyShop.api.ts'
import type { DailyShopResponse } from '../constants/daily-shop.constant.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'
import { useToast } from '../hooks/useToast.ts'

export const useDailyShop = () => {
  const query = useQuery({
    queryKey: ['daily-shop'],
    queryFn: () => DailyShopApi.get(),
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export const useBuyDailyShopItem = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (itemId: string) => DailyShopApi.buyItem(itemId),
    onSuccess: (_data, itemId) => {
      qc.setQueryData<DailyShopResponse>(['daily-shop'], (old) => {
        if (!old) {
          return old
        }
        return {
          ...old,
          items: old.items.map((item) =>
            item.id === itemId ? { ...item, purchased: true } : item,
          ),
        }
      })
    },
    onError: (error) => {
      toast({
        title: "Erreur lors de l'achat",
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

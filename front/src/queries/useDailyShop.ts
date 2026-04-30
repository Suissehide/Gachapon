import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { DailyShopApi } from '../api/dailyShop.api.ts'
import type { DailyShopResponse } from '../constants/daily-shop.constant.ts'

export const useDailyShop = () =>
  useQuery({
    queryKey: ['daily-shop'],
    queryFn: () => DailyShopApi.get(),
  })

export const useBuyDailyShopItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) => DailyShopApi.buyItem(itemId),
    onSuccess: (_data, itemId) => {
      qc.setQueryData<DailyShopResponse>(['daily-shop'], (old) => {
        if (!old) return old
        return {
          ...old,
          items: old.items.map((item) =>
            item.id === itemId ? { ...item, purchased: true } : item,
          ),
        }
      })
    },
  })
}

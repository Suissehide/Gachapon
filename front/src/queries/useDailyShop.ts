import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { DailyShopApi } from '../api/dailyShop.api.ts'

export const useDailyShop = () =>
  useQuery({
    queryKey: ['daily-shop'],
    queryFn: () => DailyShopApi.get(),
  })

export const useBuyDailyShopItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) => DailyShopApi.buyItem(itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-shop'] })
    },
  })
}

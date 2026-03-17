import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ShopApi } from '../api/shop.api.ts'

export type { PurchaseResult, ShopItem } from '../api/shop.api.ts'

export const useShopItems = () =>
  useQuery({
    queryKey: ['shop'],
    queryFn: () => ShopApi.getItems(),
  })

export const useBuyItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) => ShopApi.buyItem(itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tokens', 'balance'] })
    },
  })
}

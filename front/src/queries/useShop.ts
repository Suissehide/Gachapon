import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '../lib/api'

export type ShopItem = {
  id: string
  name: string
  description: string
  type: 'TOKEN_PACK' | 'BOOST' | 'COSMETIC'
  dustCost: number
  value: unknown
}

export type PurchaseResult = {
  purchaseId: string
  dustSpent: number
  newDustTotal: number
  item: { id: string; name: string; type: string; value: unknown }
}

export const useShopItems = () =>
  useQuery({
    queryKey: ['shop'],
    queryFn: () => api.get<{ items: ShopItem[] }>('/shop'),
  })

export const useBuyItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (itemId: string) =>
      api.post<PurchaseResult>(`/shop/${itemId}/buy`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tokens', 'balance'] })
    },
  })
}

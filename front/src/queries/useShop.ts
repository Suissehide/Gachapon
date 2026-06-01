import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ShopApi } from '../api/shop.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'
import { useToast } from '../hooks/useToast.ts'

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
  return useMutation({
    mutationFn: (itemId: string) => ShopApi.buyItem(itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tokens', 'balance'] })
      qc.invalidateQueries({ queryKey: ['shop', 'machines'] })
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

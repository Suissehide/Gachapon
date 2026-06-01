import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AdminShopApi } from '../api/admin-shop.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'
import { useToast } from '../hooks/useToast.ts'

export type { AdminShopItem } from '../api/admin-shop.api.ts'

export function useAdminShopItems() {
  const query = useQuery({
    queryKey: ['admin', 'shop-items'],
    queryFn: () => AdminShopApi.getItems(),
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}

export function useAdminCreateShopItem() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (data: Parameters<typeof AdminShopApi.createItem>[0]) =>
      AdminShopApi.createItem(data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['admin', 'shop-items'] }),
    onError: (error) => {
      toast({
        title: "Erreur lors de la création de l'article",
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export function useAdminUpdateShopItem() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: Parameters<typeof AdminShopApi.updateItem>[1] & { id: string }) =>
      AdminShopApi.updateItem(id, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['admin', 'shop-items'] }),
    onError: (error) => {
      toast({
        title: "Erreur lors de la mise à jour de l'article",
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export function useAdminDeleteShopItem() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (id: string) => AdminShopApi.deleteItem(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['admin', 'shop-items'] }),
    onError: (error) => {
      toast({
        title: "Erreur lors de la suppression de l'article",
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

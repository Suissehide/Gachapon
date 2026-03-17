import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AdminShopApi } from '../api/admin-shop.api.ts'

export type { AdminShopItem } from '../api/admin-shop.api.ts'

export function useAdminShopItems() {
  return useQuery({
    queryKey: ['admin', 'shop-items'],
    queryFn: () => AdminShopApi.getItems(),
  })
}

export function useAdminCreateShopItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof AdminShopApi.createItem>[0]) =>
      AdminShopApi.createItem(data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['admin', 'shop-items'] }),
  })
}

export function useAdminUpdateShopItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: Parameters<typeof AdminShopApi.updateItem>[1] & { id: string }) =>
      AdminShopApi.updateItem(id, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['admin', 'shop-items'] }),
  })
}

export function useAdminDeleteShopItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => AdminShopApi.deleteItem(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['admin', 'shop-items'] }),
  })
}

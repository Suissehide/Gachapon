import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation('admin')
  return useMutation({
    mutationFn: (data: Parameters<typeof AdminShopApi.createItem>[0]) =>
      AdminShopApi.createItem(data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['admin', 'shop-items'] }),
    onError: (error) => {
      toast({
        title: t('toasts.shop.createItemErrorTitle'),
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export function useAdminUpdateShopItem() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation('admin')
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
        title: t('toasts.shop.updateItemErrorTitle'),
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export function useAdminDeleteShopItem() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation('admin')
  return useMutation({
    mutationFn: (id: string) => AdminShopApi.deleteItem(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['admin', 'shop-items'] }),
    onError: (error) => {
      toast({
        title: t('toasts.shop.deleteItemErrorTitle'),
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { OrdersApi } from '../api/orders.api.ts'
import type { DeliveryPick } from '../constants/orders.constant.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useToast } from '../hooks/useToast.ts'
import i18n from '../i18n/index.ts'
import { isApiError } from '../libs/httpErrorHandler.ts'
import { useAuthStore } from '../stores/auth.store.ts'

export const ORDERS_QUERY_KEY = ['orders'] as const

/** `poll` : réservé à la page du comptoir. Ailleurs (pastille du menu), pas
 *  d'intervalle et un staleTime long — chaque GET ouvre une transaction. */
export const useOrders = ({ enabled = true, poll = false } = {}) =>
  useQuery({
    queryKey: ORDERS_QUERY_KEY,
    queryFn: () => OrdersApi.board(),
    enabled,
    // Un client peut arriver pendant que la page est ouverte : on revérifie
    // chaque minute plutôt que de calculer le prochain nextAt.
    refetchInterval: poll ? 60_000 : false,
    staleTime: poll ? 0 : 5 * 60_000,
  })

function useOrderErrorToast() {
  const { toast } = useToast()
  return (error: Error) =>
    toast({
      title:
        isApiError(error) && error.title
          ? error.title
          : i18n.t('orders:toasts.errorTitle'),
      message: error.message,
      severity: TOAST_SEVERITY.ERROR,
    })
}

export const useDeliverOrder = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  const onError = useOrderErrorToast()
  return useMutation({
    mutationFn: ({
      orderId,
      picks,
    }: {
      orderId: string
      picks: DeliveryPick[]
    }) => OrdersApi.deliver(orderId, picks),
    onSuccess: ({ reward }) => {
      qc.invalidateQueries({ queryKey: ORDERS_QUERY_KEY })
      qc.invalidateQueries({ queryKey: ['collection'] })
      qc.invalidateQueries({ queryKey: ['profile'] })
      qc.invalidateQueries({ queryKey: ['tokens', 'balance'] })
      void useAuthStore.getState().fetchMe()
      toast({
        title: i18n.t('orders:toasts.deliveredTitle'),
        message: i18n.t('orders:toasts.deliveredMessage', reward),
        severity: TOAST_SEVERITY.SUCCESS,
      })
    },
    onError,
  })
}

export const useDismissOrder = () => {
  const qc = useQueryClient()
  const onError = useOrderErrorToast()
  return useMutation({
    mutationFn: (orderId: string) => OrdersApi.dismiss(orderId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ORDERS_QUERY_KEY }),
    onError,
  })
}

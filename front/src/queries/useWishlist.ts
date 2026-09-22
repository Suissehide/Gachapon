import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { WishlistApi } from '../api/wishlist.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useToast } from '../hooks/useToast.ts'
import { currentLocale } from '../i18n/index.ts'
import { isApiError } from '../libs/httpErrorHandler.ts'
import { formatNumber } from '../libs/utils.ts'
import { useAuthStore } from '../stores/auth.store.ts'

export type {
  WishlistCard,
  WishlistPurchaseResult,
  WishlistResponse,
} from '../api/wishlist.api.ts'

export const useWishlist = () => {
  return useQuery({
    queryKey: ['wishlist'],
    queryFn: () => WishlistApi.get(),
    staleTime: 30_000,
  })
}

/** Ajoute ou retire un vœu selon `wished` — le cœur de la carte bascule. */
export const useToggleWishlist = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation('wishlist')
  return useMutation({
    mutationFn: ({ cardId, wished }: { cardId: string; wished: boolean }) =>
      wished ? WishlistApi.remove(cardId) : WishlistApi.add(cardId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wishlist'] })
    },
    onError: (error) => {
      const title =
        isApiError(error) && error.title
          ? error.title
          : t('toasts.toggleErrorTitle')
      toast({
        title,
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

export const usePurchaseWishlist = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation('wishlist')
  const setUser = useAuthStore((s) => s.setUser)
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: (cardId: string) => WishlistApi.purchase(cardId),
    onSuccess: (result) => {
      if (user) {
        setUser({ ...user, dust: result.newDustBalance })
      }
      qc.invalidateQueries({ queryKey: ['wishlist'] })
      qc.invalidateQueries({ queryKey: ['collection'] })
      toast({
        title: result.card.name,
        message: t('toasts.purchasedMessage', {
          dust: formatNumber(result.dustSpent, currentLocale()),
        }),
        severity: TOAST_SEVERITY.SUCCESS,
      })
    },
    onError: (error) => {
      const title =
        isApiError(error) && error.title
          ? error.title
          : t('toasts.purchaseErrorTitle')
      toast({
        title,
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

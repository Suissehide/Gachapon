import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { WishlistApi } from '../api/wishlist.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useToast } from '../hooks/useToast.ts'
import { isApiError } from '../libs/httpErrorHandler.ts'
import { useAuthStore } from '../stores/auth.store.ts'

export type { WishlistResponse, WishlistPurchaseResult } from '../api/wishlist.api.ts'

export const useWishlist = () => {
  return useQuery({
    queryKey: ['wishlist'],
    queryFn: () => WishlistApi.get(),
  })
}

export const useSetWishlist = () => {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (cardId: string) => WishlistApi.set(cardId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wishlist'] })
    },
    onError: (error) => {
      const title = isApiError(error) && error.title ? error.title : 'Erreur lors de la définition du vœu'
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
  const setUser = useAuthStore((s) => s.setUser)
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: () => WishlistApi.purchase(),
    onSuccess: (result) => {
      if (user) {
        setUser({ ...user, dust: result.newDustBalance })
      }
      qc.invalidateQueries({ queryKey: ['wishlist'] })
      qc.invalidateQueries({ queryKey: ['collection'] })
      toast({
        title: result.card.name,
        message: `Obtenue ! −${result.dustSpent.toLocaleString('fr-FR')} poussière`,
        severity: TOAST_SEVERITY.SUCCESS,
      })
    },
    onError: (error) => {
      const title = isApiError(error) && error.title ? error.title : "Erreur lors de l'achat du vœu"
      toast({
        title,
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

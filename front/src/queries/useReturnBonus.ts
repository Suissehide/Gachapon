import { useMutation, useQueryClient } from '@tanstack/react-query'

import { ReturnBonusApi } from '../api/returnBonus.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useToast } from '../hooks/useToast.ts'
import i18n from '../i18n/index.ts'
import { isApiError } from '../libs/httpErrorHandler.ts'

/** Les soldes de la topbar se rafraîchissent derrière la popup ; `fetchMe()`
 *  n'est appelé qu'à la fermeture de la popup. */
export function useClaimReturnBonus() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: ReturnBonusApi.claim,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tokens', 'balance'] })
      qc.invalidateQueries({ queryKey: ['combat', 'points'] })
    },
    onError: (error: Error) => {
      // 404 : déjà récupéré (autre onglet) — rien à signaler.
      if (isApiError(error) && error.status === 404) {
        return
      }
      toast({
        title: i18n.t('returnBonus:apiTitle'),
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { ReturnBonusApi } from '../api/returnBonus.api.ts'

/** Les soldes de la topbar se rafraîchissent derrière la popup ; `fetchMe()`
 *  n'est appelé qu'à la fermeture, sinon `returnChest` repasserait à null et
 *  fermerait la popup en plein écran « Tu récupères ». */
export function useClaimReturnBonus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ReturnBonusApi.claim,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tokens', 'balance'] })
      qc.invalidateQueries({ queryKey: ['combat', 'points'] })
    },
  })
}

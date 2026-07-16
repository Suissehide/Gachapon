import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  AdminRewardsApi,
  type BulkRewardBody,
} from '../api/admin-rewards.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useToast } from '../hooks/useToast.ts'

export function useAdminBulkReward() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useMutation({
    mutationFn: (body: BulkRewardBody) => AdminRewardsApi.sendBulk(body),
    onSuccess: ({ count }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast({
        title: 'Récompenses envoyées',
        message: `${count} joueur${count > 1 ? 's' : ''} récompensé${count > 1 ? 's' : ''}`,
        severity: TOAST_SEVERITY.SUCCESS,
      })
    },
    onError: (error) => {
      toast({
        title: "Erreur lors de l'envoi",
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

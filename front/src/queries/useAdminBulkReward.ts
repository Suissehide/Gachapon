import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import {
  AdminRewardsApi,
  type BulkRewardBody,
} from '../api/admin-rewards.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useToast } from '../hooks/useToast.ts'

export function useAdminBulkReward() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { t } = useTranslation('admin')
  return useMutation({
    mutationFn: (body: BulkRewardBody) => AdminRewardsApi.sendBulk(body),
    onSuccess: ({ count }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast({
        title: t('toasts.bulkReward.sentTitle'),
        message: t('toasts.bulkReward.sentMessage', { count }),
        severity: TOAST_SEVERITY.SUCCESS,
      })
    },
    onError: (error) => {
      toast({
        title: t('toasts.bulkReward.sendErrorTitle'),
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
  })
}

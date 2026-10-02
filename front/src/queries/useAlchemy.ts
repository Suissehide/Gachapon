import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AlchemyApi } from '../api/alchemy.api.ts'
import type {
  AlchemyFromRarity,
  AlchemyPick,
} from '../constants/alchemy.constant.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useToast } from '../hooks/useToast.ts'
import i18n from '../i18n/index.ts'
import { isApiError } from '../libs/httpErrorHandler.ts'
import { useRewardRevealStore } from '../stores/rewardReveal.store.ts'

export const ALCHEMY_QUERY_KEY = ['alchemy'] as const

export const useAlchemy = () =>
  useQuery({
    queryKey: ALCHEMY_QUERY_KEY,
    queryFn: () => AlchemyApi.board(),
  })

export const useTransmute = () => {
  const qc = useQueryClient()
  const reveal = useRewardRevealStore((s) => s.reveal)
  const { toast } = useToast()
  return useMutation({
    mutationFn: ({
      fromRarity,
      picks,
    }: {
      fromRarity: AlchemyFromRarity
      picks: AlchemyPick[]
    }) => AlchemyApi.transmute(fromRarity, picks),
    onSuccess: (result) => {
      for (const key of [
        ALCHEMY_QUERY_KEY,
        ['collection'],
        ['profile'],
        ['quests'],
        ['achievements'],
      ]) {
        qc.invalidateQueries({ queryKey: key })
      }
      reveal([
        {
          card: result.card,
          wasDuplicate: !result.isNew,
          dustEarned: 0,
          pityCurrent: 0,
          wasFreePull: false,
          wasGoldenBall: false,
          wasBoostGuarantee: false,
        },
      ])
    },
    onError: (error) =>
      toast({
        title:
          isApiError(error) && error.title
            ? error.title
            : i18n.t('alchemy:toasts.errorTitle'),
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      }),
  })
}

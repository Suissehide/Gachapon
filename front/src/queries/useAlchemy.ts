import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AlchemyApi } from '../api/alchemy.api.ts'
import type {
  AlchemyFromRarity,
  AlchemyPick,
  TransmuteResult,
} from '../constants/alchemy.constant.ts'
import type { PullBatchEntry } from '../constants/gacha.constant.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useToast } from '../hooks/useToast.ts'
import i18n from '../i18n/index.ts'
import { isApiError } from '../libs/httpErrorHandler.ts'
import { useAchievementUnlockStore } from '../stores/achievementUnlock.store.ts'
import { useAuthStore } from '../stores/auth.store.ts'

export const ALCHEMY_QUERY_KEY = ['alchemy'] as const

export const useAlchemy = () =>
  useQuery({
    queryKey: ALCHEMY_QUERY_KEY,
    queryFn: () => AlchemyApi.board(),
  })

/** Carte transmutée → entrée du reveal. La page appelle `reveal` elle-même,
 *  une fois l'animation du chaudron terminée. */
export const transmuteResultToRevealEntry = (
  result: TransmuteResult,
): PullBatchEntry => ({
  card: result.card,
  wasDuplicate: !result.isNew,
  dustEarned: 0,
  pityCurrent: 0,
  wasFreePull: false,
  wasGoldenBall: false,
  wasBoostGuarantee: false,
})

export const useTransmute = () => {
  const qc = useQueryClient()
  const enqueueAchievementUnlock = useAchievementUnlockStore((s) => s.enqueue)
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
      if (result.unlockedAchievements?.length) {
        enqueueAchievementUnlock(result.unlockedAchievements)
        // The unlocked achievement mints a pending reward — refresh the badge.
        void useAuthStore.getState().fetchMe()
      }
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

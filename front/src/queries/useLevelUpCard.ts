import { useMutation, useQueryClient } from '@tanstack/react-query'

import { CollectionApi, type UserCard } from '../api/collection.api'
import { invalidateBattleCache } from './useCampaign.ts'

export function useLevelUpCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      userCardId,
      targetLevel,
    }: {
      userCardId: string
      targetLevel: number
    }) => CollectionApi.levelUpCard(userCardId, targetLevel),
    onSuccess: ({ newLevel }, { userCardId }) => {
      // Seul le niveau de cette carte change : on l'écrit dans le cache au lieu
      // de recharger toute la collection à chaque clic.
      qc.setQueriesData<{ cards: UserCard[] }>(
        { queryKey: ['collection'] },
        (old) =>
          old && {
            ...old,
            cards: old.cards.map((uc) =>
              uc.id === userCardId ? { ...uc, level: newLevel } : uc,
            ),
          },
      )
      qc.invalidateQueries({ queryKey: ['profile'] })
      // Leveling a card fires CARD_LEVELED + GOLD_SPENT events that feed the
      // quest + achievement engines — refresh their progress.
      qc.invalidateQueries({ queryKey: ['quests'] })
      qc.invalidateQueries({ queryKey: ['achievements'] })
      // Stronger card → any cached battle is now stale; drop the replay cache.
      invalidateBattleCache(qc)
    },
  })
}

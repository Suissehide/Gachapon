import { create } from 'zustand'

import type { PullBatchEntry } from '../constants/gacha.constant.ts'
import type { ClaimedCard } from '../constants/rewards.constant.ts'

type RewardRevealState = {
  cards: PullBatchEntry[]
  reveal: (cards: PullBatchEntry[]) => void
  close: () => void
}

/** Queues cards granted by a claimed reward so a root-mounted overlay can play
 *  the pull reveal animation for them, independently of the rewards popup. */
export const useRewardRevealStore = create<RewardRevealState>((set) => ({
  cards: [],
  reveal: (cards) => set({ cards }),
  close: () => set({ cards: [] }),
}))

/** Maps a claimed reward card onto the reveal's PullBatchEntry shape. The
 *  pull-only flags (pity, golden ball, free pull…) don't apply here. */
export function claimedCardToRevealEntry(c: ClaimedCard): PullBatchEntry {
  return {
    card: {
      id: c.card.id,
      name: c.card.name,
      imageUrl: c.card.imageUrl,
      rarity: c.card.rarity,
      variant: c.card.variant,
      set: c.card.set,
    },
    wasDuplicate: c.wasDuplicate,
    dustEarned: 0,
    pityCurrent: 0,
    wasFreePull: false,
    wasGoldenBall: false,
    wasBoostGuarantee: false,
  }
}

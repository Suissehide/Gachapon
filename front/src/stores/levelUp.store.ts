import { create } from 'zustand'

import { useGuestNudgeStore } from '../components/guest/GuestSaveBanner.tsx'
import type { LevelUpReward } from '../utils/levelRewards.ts'

type LevelUpState = {
  level: number | null
  reward: LevelUpReward | null
  triggerLevelUp: (level: number, reward?: LevelUpReward) => void
  dismiss: () => void
}

export const useLevelUpStore = create<LevelUpState>((set) => ({
  level: null,
  reward: null,
  triggerLevelUp: (level, reward) => {
    // Moment fort côté invité : une occasion de plus de proposer la sauvegarde.
    useGuestNudgeStore.getState().nudge()
    set({ level, reward: reward ?? null })
  },
  dismiss: () => set({ level: null, reward: null }),
}))

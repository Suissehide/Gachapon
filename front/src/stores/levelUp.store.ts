import { create } from 'zustand'

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
  triggerLevelUp: (level, reward) => set({ level, reward: reward ?? null }),
  dismiss: () => set({ level: null, reward: null }),
}))

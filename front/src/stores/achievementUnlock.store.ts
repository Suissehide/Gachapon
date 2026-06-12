import { create } from 'zustand'
import type { UnlockedAchievement } from '../constants/achievements.constant'

type AchievementUnlockState = {
  queue: UnlockedAchievement[]
  enqueue: (unlocks: UnlockedAchievement[]) => void
  dismiss: () => void
}

export const useAchievementUnlockStore = create<AchievementUnlockState>((set) => ({
  queue: [],
  enqueue: (unlocks) =>
    set((s) => ({ queue: [...s.queue, ...unlocks] })),
  dismiss: () => set((s) => ({ queue: s.queue.slice(1) })),
}))

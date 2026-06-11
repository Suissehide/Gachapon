import { create } from 'zustand'

type LevelUpState = {
  level: number | null
  triggerLevelUp: (level: number) => void
  dismiss: () => void
}

export const useLevelUpStore = create<LevelUpState>((set) => ({
  level: null,
  triggerLevelUp: (level) => set({ level }),
  dismiss: () => set({ level: null }),
}))

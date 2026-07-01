import { create } from 'zustand'

import { api } from '../lib/api.js'
import { queryClient } from '../lib/queryClient.ts'
import type { UnlockedAchievement } from '../constants/achievements.constant.ts'
import { useAchievementUnlockStore } from './achievementUnlock.store.ts'

export type AuthUser = {
  id: string
  username: string
  email: string
  role: string
  tokens: number
  dust: number
  gold: number
  avatar: string | null
  banner: string | null
  pendingRewardsCount: number
}

type MeResponse = AuthUser & {
  unlockedAchievements?: UnlockedAchievement[]
}

type AuthState = {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  fetchMe: () => Promise<void>
  logout: () => Promise<void>
  setUser: (user: AuthUser) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  fetchMe: async () => {
    set({ isLoading: true })
    try {
      const response = await api.get<MeResponse>('/auth/me')
      const { unlockedAchievements, ...user } = response
      set({ user, isAuthenticated: true, isLoading: false })
      if (unlockedAchievements?.length) {
        useAchievementUnlockStore.getState().enqueue(unlockedAchievements)
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      /* ignore */
    }
    // Wipe every cached query so the next account never sees the previous
    // user's collection / shop / combat / etc. data on first paint.
    queryClient.clear()
    set({ user: null, isAuthenticated: false })
  },

  setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),
}))

import { create } from 'zustand'

import { api } from '../lib/api.js'

export type AuthUser = {
  id: string
  username: string
  email: string
  role: string
  tokens: number
  dust: number
  avatar: string | null
  banner: string | null
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
      const user = await api.get<AuthUser>('/auth/me')
      set({ user, isAuthenticated: true, isLoading: false })
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
    set({ user: null, isAuthenticated: false })
  },

  setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),
}))

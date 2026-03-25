import { create } from 'zustand'

import type { AuthTab } from '../components/auth/index.ts'

interface AuthDialogState {
  open: boolean
  tab: AuthTab
  openLogin: () => void
  openRegister: () => void
  setOpen: (open: boolean) => void
}

export const useAuthDialogStore = create<AuthDialogState>((set) => ({
  open: false,
  tab: 'login',
  openLogin: () => set({ open: true, tab: 'login' }),
  openRegister: () => set({ open: true, tab: 'register' }),
  setOpen: (open) => set({ open }),
}))

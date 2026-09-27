import { create } from 'zustand'

import type { AuthTab } from '../components/auth/authDialog.tsx'
import { selectIsGuest, useAuthStore } from './auth.store.ts'

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
  openRegister: () => {
    // Un invité qui s'inscrit à part créerait un second compte, et le lien de
    // vérification remplacerait ses cookies : on l'envoie sur la conversion.
    if (selectIsGuest(useAuthStore.getState())) {
      window.location.assign('/settings')
      return
    }
    set({ open: true, tab: 'register' })
  },
  setOpen: (open) => set({ open }),
}))

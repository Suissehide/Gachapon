import { create } from 'zustand'

type GuestSaveDialogState = {
  open: boolean
  setOpen: (open: boolean) => void
}

/** Popup « Sauvegarder ma progression » d'un compte invité (pseudo + conversion). */
export const useGuestSaveDialogStore = create<GuestSaveDialogState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}))

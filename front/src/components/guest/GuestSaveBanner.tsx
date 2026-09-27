import { X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { create } from 'zustand'

import { useIsGuest } from '../../stores/auth.store.ts'
import { useGuestSaveDialogStore } from '../../stores/guestSaveDialog.store.ts'
import { Button } from '../ui/button.tsx'

const DISMISS_KEY = 'gachapon_guest_banner_dismissed_until'
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000

const readDismissedUntil = (): number => {
  try {
    return Number(localStorage.getItem(DISMISS_KEY) ?? 0)
  } catch {
    return 0
  }
}

/** Moments forts (légendaire, montée de niveau, streak) : un seul par session. */
export const useGuestNudgeStore = create<{
  nudged: boolean
  used: boolean
  nudge: () => void
}>((set, get) => ({
  nudged: false,
  used: false,
  nudge: () => {
    if (!get().used) {
      set({ nudged: true, used: true })
    }
  },
}))

export function GuestSaveBanner() {
  const { t } = useTranslation('guest')
  const openSaveDialog = useGuestSaveDialogStore((s) => s.setOpen)
  const isGuest = useIsGuest()
  const nudged = useGuestNudgeStore((s) => s.nudged)
  const [dismissedUntil, setDismissedUntil] = useState(readDismissedUntil)

  if (!isGuest || (!nudged && Date.now() < dismissedUntil)) {
    return null
  }

  const dismiss = () => {
    const until = Date.now() + DISMISS_MS
    try {
      localStorage.setItem(DISMISS_KEY, String(until))
    } catch {
      /* stockage indisponible : la bannière reviendra au prochain chargement */
    }
    useGuestNudgeStore.setState({ nudged: false })
    setDismissedUntil(until)
  }

  return (
    <div className="flex items-center gap-3 border-b border-primary/30 bg-primary/5 px-4 py-2 text-sm">
      <p className="flex-1 text-text">{t('banner.message')}</p>
      <Button size="sm" onClick={() => openSaveDialog(true)}>
        {t('banner.cta')}
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={dismiss}
        aria-label={t('banner.dismiss')}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

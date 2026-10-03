import { Megaphone } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { NotificationBadge } from '../notifications/NotificationBadge.tsx'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet.tsx'
import { ChangelogTimeline, RELEASES } from './ChangelogTimeline.tsx'

const KEY = 'gachapon.changelogSeenVersion'
const LATEST = RELEASES[0]?.version

/**
 * Dernière version du changelog lue par le joueur. Locale au navigateur,
 * comme `seenDuels` : un simple « j'ai vu » ne vaut pas une colonne en base,
 * au prix d'une pastille qui réapparaît une fois sur un autre appareil.
 */
function readSeen(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function ChangelogButton() {
  const { t } = useTranslation(['layout', 'changelog'])
  const [seen, setSeen] = useState(readSeen)
  const unread = Boolean(LATEST) && seen !== LATEST
  const label = unread
    ? t('layout:appNav.changelogUnreadAriaLabel')
    : t('layout:appNav.changelogAriaLabel')

  const onOpenChange = (open: boolean) => {
    if (!open || !LATEST) {
      return
    }
    try {
      localStorage.setItem(KEY, LATEST)
    } catch {
      /* stockage indisponible : la pastille reviendra au prochain chargement */
    }
    setSeen(LATEST)
  }

  return (
    <Sheet onOpenChange={onOpenChange}>
      <div className="relative">
        <SheetTrigger
          variant="ghost"
          size="icon"
          aria-label={label}
          title={label}
          className="h-10 w-10 rounded-[11px] text-text-light/60 hover:bg-text/[0.06] hover:text-text"
        >
          <Megaphone className="h-5 w-5" />
        </SheetTrigger>
        {unread && (
          <NotificationBadge
            shape="dot"
            tone="gain"
            className="absolute top-1.5 right-1.5"
          />
        )}
      </div>
      <SheetContent className="w-[min(640px,100vw)]">
        <SheetHeader>
          <SheetTitle>{t('changelog:page.title')}</SheetTitle>
        </SheetHeader>
        <div className="px-6 py-6">
          <ChangelogTimeline />
        </div>
      </SheetContent>
    </Sheet>
  )
}

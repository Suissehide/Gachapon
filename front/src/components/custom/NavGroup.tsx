import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronDown, Lock } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { useTranslation } from 'react-i18next'

import { cn } from '../../libs/utils.ts'
import { NotificationBadge } from '../notifications/NotificationBadge.tsx'
import {
  DropdownMenuCustomContent,
  DropdownMenuCustomItem,
} from '../ui/dropdownMenu.tsx'

/** Sens d'un compteur : `alert` (rouge, à traiter) ou `gain` (ambre, à
    récupérer/dépenser) — voir `NotificationBadge`. */
export type BadgeTone = 'alert' | 'gain'

export type NavItem = {
  to:
    | '/play'
    | '/collection'
    | '/equipment'
    | '/skills'
    | '/campaign'
    | '/tower'
    | '/shop'
    | '/orders'
    | '/team'
    | '/leaderboard'
  label: string
  badge?: number
  /** Défaut `alert` si `badge` est posé sans préciser de teinte. */
  badgeTone?: BadgeTone
  locked?: boolean
}

export type NavGroupDef = { id: string; label: string; items: NavItem[] }

/** Une route appartient à un item si elle est sa page ou l'une de ses sous-pages (`/tower/fire`). */
export const isUnder = (pathname: string, to: string) =>
  pathname === to || pathname.startsWith(`${to}/`)

/** Point de nav du groupe : rouge si un item `alert` a un compteur > 0,
    sinon ambre si un item `gain` en a un, sinon aucun point. */
function groupTone(items: NavItem[]): BadgeTone | null {
  const hasAlert = items.some(
    (item) => (item.badgeTone ?? 'alert') === 'alert' && (item.badge ?? 0) > 0,
  )
  if (hasAlert) {
    return 'alert'
  }
  const hasGain = items.some(
    (item) => item.badgeTone === 'gain' && (item.badge ?? 0) > 0,
  )
  return hasGain ? 'gain' : null
}

/** Onglet déroulant de la barre desktop : même allure que les onglets-liens. */
export function NavGroup({
  group,
  tabClass,
}: {
  group: NavGroupDef
  tabClass: string
}) {
  const { t } = useTranslation(['layout', 'notifications'])
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const active = group.items.some((item) => isUnder(pathname, item.to))
  const tone = groupTone(group.items)

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        className={cn(tabClass, 'group outline-none', active && 'active')}
        aria-label={
          tone
            ? t('layout:appNav.groupBadgeAriaLabel', { section: group.label })
            : undefined
        }
      >
        <span className="relative inline-flex items-center gap-1.5">
          {group.label}
          {tone && <NotificationBadge shape="dot" tone={tone} />}
          <ChevronDown
            aria-hidden
            className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180"
          />
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 bottom-0 left-3 h-[3px] rounded-t-[3px] bg-transparent"
        />
      </DropdownMenu.Trigger>

      <DropdownMenuCustomContent align="start" className="min-w-[180px]">
        {group.items.map((item) => (
          <DropdownMenuCustomItem key={item.to} asChild>
            <Link
              to={item.to}
              className="justify-between gap-2 px-3 py-2 text-sm font-semibold text-text-light [&.active]:bg-primary/15 [&.active]:text-primary-dark"
            >
              <span className="inline-flex items-center gap-1.5">
                {item.label}
                {item.locked && <Lock className="h-3 w-3 text-text-light" />}
              </span>
              <NotificationBadge
                shape="pill"
                tone={item.badgeTone ?? 'alert'}
                count={item.badge ?? 0}
                ariaLabel={t('notifications:pendingAriaLabel', {
                  count: item.badge ?? 0,
                })}
              />
            </Link>
          </DropdownMenuCustomItem>
        ))}
      </DropdownMenuCustomContent>
    </DropdownMenu.Root>
  )
}

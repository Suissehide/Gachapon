import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronDown, Lock } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'

import { cn } from '../../libs/utils.ts'
import { NotificationDot } from '../notifications/NotificationDot.tsx'
import {
  DropdownMenuCustomContent,
  DropdownMenuCustomItem,
} from '../ui/dropdownMenu.tsx'

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
  locked?: boolean
}

export type NavGroupDef = { id: string; label: string; items: NavItem[] }

/** Une route appartient à un item si elle est sa page ou l'une de ses sous-pages (`/tower/fire`). */
export const isUnder = (pathname: string, to: string) =>
  pathname === to || pathname.startsWith(`${to}/`)

/** Onglet déroulant de la barre desktop : même allure que les onglets-liens. */
export function NavGroup({
  group,
  tabClass,
}: {
  group: NavGroupDef
  tabClass: string
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const active = group.items.some((item) => isUnder(pathname, item.to))
  const badge = group.items.reduce((sum, item) => sum + (item.badge ?? 0), 0)

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        className={cn(tabClass, 'group outline-none', active && 'active')}
      >
        <span className="relative inline-flex items-center gap-1">
          {group.label}
          <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          <NotificationDot count={badge} className="-right-4 -top-2" />
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
              className="gap-2 px-3 py-2 text-sm font-semibold text-text-light [&.active]:bg-primary/15 [&.active]:text-primary-dark"
            >
              <span className="relative inline-flex items-center gap-1.5">
                {item.label}
                {item.locked && <Lock className="h-3 w-3 text-text-light" />}
                <NotificationDot
                  count={item.badge ?? 0}
                  className="-right-5 -top-2"
                />
              </span>
            </Link>
          </DropdownMenuCustomItem>
        ))}
      </DropdownMenuCustomContent>
    </DropdownMenu.Root>
  )
}

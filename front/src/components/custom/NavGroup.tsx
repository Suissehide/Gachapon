import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { ChevronDown, Lock } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { type PointerEvent, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { TeamSummary } from '../../constants/teams.constant.ts'
import { cn } from '../../libs/utils.ts'
import { NotificationBadge } from '../notifications/NotificationBadge.tsx'
import { TeamEmblem } from '../shared/TeamEmblem.tsx'
import {
  DropdownMenuCustomContent,
  DropdownMenuCustomItem,
  DropdownMenuCustomSubContent,
  DropdownMenuCustomSubTrigger,
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
    | '/alchemy'
    | '/campaign'
    | '/tower'
    | '/dummy'
    | '/shop'
    | '/orders'
    | '/team'
    | '/leaderboard'
  label: string
  badge?: number
  /** Défaut `alert` si `badge` est posé sans préciser de teinte. */
  badgeTone?: BadgeTone
  /** Affiche un point plutôt que le compteur : le badge signale une
      nouveauté, pas une quantité. */
  badgeDot?: boolean
  locked?: boolean
  /** Équipes du joueur, listées en sous-menu sous l'entrée `/team`. */
  teams?: NavTeam[]
}

/** Ce que le sous-menu affiche d'une équipe : emblème, nom, niveau, effectif. */
export type NavTeam = Pick<
  TeamSummary,
  'id' | 'name' | 'hue' | 'level' | 'memberCount' | 'maxMembers'
>

// Survol doux pour un menu de navigation : le `bg-primary/60` par défaut des
// primitives, pensé pour des listes d'actions, saturait toute la ligne.
const NAV_ROW_HOVER =
  'hover:bg-primary/10 hover:text-text focus:bg-primary/10 focus:text-text'

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
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const navigate = useNavigate()

  // Survol à la souris seulement : au tactile, le clic garde la main.
  const hoverOpen = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') {
      return
    }
    clearTimeout(closeTimer.current)
    setOpen(true)
  }
  // Délai pour traverser l'écart entre l'onglet et le menu sans le fermer.
  const hoverClose = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') {
      return
    }
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }

  return (
    <DropdownMenu.Root modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger
        ref={triggerRef}
        onPointerEnter={hoverOpen}
        onPointerLeave={hoverClose}
        // Déjà ouvert au survol : un clic souris ne doit pas le refermer.
        onPointerDown={(e) => e.pointerType === 'mouse' && e.preventDefault()}
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

      <DropdownMenuCustomContent
        align="start"
        className="min-w-[180px]"
        onPointerEnter={hoverOpen}
        onPointerLeave={hoverClose}
        // Le clic sur l'onglet compte comme « dehors » : sans ça il referme le menu.
        onPointerDownOutside={(e) => {
          if (triggerRef.current?.contains(e.target as Node)) {
            e.preventDefault()
          }
        }}
      >
        {group.items.map((item) =>
          item.teams?.length ? (
            <DropdownMenu.Sub key={item.to}>
              <DropdownMenuCustomSubTrigger
                // Le libellé reste un lien : un clic ouvre la page des équipes.
                onClick={() => {
                  setOpen(false)
                  void navigate({ to: item.to })
                }}
                className={cn(
                  'gap-2 px-3 py-2 font-semibold text-text-light',
                  NAV_ROW_HOVER,
                  // Sous-menu ouvert : la ligne reste repérée, sans le
                  // fond saturé qui la faisait passer pour sélectionnée.
                  'data-[state=open]:bg-primary/10 data-[state=open]:text-primary-dark',
                  isUnder(pathname, item.to) &&
                    'bg-primary/15 text-primary-dark',
                )}
              >
                {item.label}
              </DropdownMenuCustomSubTrigger>
              <DropdownMenuCustomSubContent
                className="w-[240px]"
                onPointerEnter={hoverOpen}
                onPointerLeave={hoverClose}
              >
                {item.teams.map((team) => (
                  <DropdownMenuCustomItem
                    key={team.id}
                    asChild
                    className={NAV_ROW_HOVER}
                  >
                    <Link
                      to="/team/$id"
                      params={{ id: team.id }}
                      className="group/team gap-2.5 rounded-lg px-2.5 py-2 [&.active]:bg-primary/15"
                    >
                      <TeamEmblem
                        hue={team.hue}
                        letter={team.name.charAt(0).toUpperCase()}
                        size={32}
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-sm font-bold text-text group-[.active]/team:text-primary-dark">
                          {team.name}
                        </span>
                        <span className="font-mono text-[10.5px] text-text-light/70">
                          {t('layout:appNav.teamMeta', {
                            level: team.level,
                            count: team.memberCount,
                            max: team.maxMembers,
                          })}
                        </span>
                      </span>
                    </Link>
                  </DropdownMenuCustomItem>
                ))}
              </DropdownMenuCustomSubContent>
            </DropdownMenu.Sub>
          ) : (
            <DropdownMenuCustomItem
              key={item.to}
              asChild
              // Sur l'item, pas sur le lien : `cn` y fusionne le survol avec
              // celui de la primitive, alors que le Slot ne fait que concaténer.
              className={NAV_ROW_HOVER}
            >
              <Link
                to={item.to}
                className="justify-between gap-2 px-3 py-2 text-sm font-semibold text-text-light [&.active]:bg-primary/15 [&.active]:text-primary-dark"
              >
                <span className="inline-flex items-center gap-1.5">
                  {item.label}
                  {item.locked && <Lock className="h-3 w-3 text-text-light" />}
                </span>
                {item.badgeDot ? (
                  (item.badge ?? 0) > 0 && (
                    <NotificationBadge
                      shape="dot"
                      tone={item.badgeTone ?? 'alert'}
                      ariaLabel={t('notifications:newAriaLabel')}
                    />
                  )
                ) : (
                  <NotificationBadge
                    shape="pill"
                    tone={item.badgeTone ?? 'alert'}
                    count={item.badge ?? 0}
                    ariaLabel={t('notifications:pendingAriaLabel', {
                      count: item.badge ?? 0,
                    })}
                  />
                )}
              </Link>
            </DropdownMenuCustomItem>
          ),
        )}
      </DropdownMenuCustomContent>
    </DropdownMenu.Root>
  )
}

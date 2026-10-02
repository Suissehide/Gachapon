import { Link } from '@tanstack/react-router'
import { Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { NotificationBadge } from '../notifications/NotificationBadge.tsx'
import type { BadgeTone } from './NavGroup.tsx'

/** Délai d'entrée échelonné d'une ligne du menu (80 ms, puis +45 ms par ligne). */
const staggerDelay = (index: number) => `${80 + index * 45}ms`

export const dotGradients = [
  'from-primary-light to-primary',
  'from-secondary to-accent',
  'from-primary to-secondary',
]

/** Capsule gachapon icon that morphs into ✕ when open */
export function CapsuleIcon({ open }: { open: boolean }) {
  return (
    <div className="cursor-pointer relative w-6 h-6" aria-hidden="true">
      <span
        className={`absolute inset-x-0 h-3 bg-linear-to-r from-primary-light to-primary
          transition-[top,transform,border-radius] duration-300 ease-spring
          ${open ? 'top-2 rotate-45 rounded-sm' : 'top-px rotate-0 rounded-t-full rounded-b-none'}`}
      />
      <span
        className={`absolute inset-x-0 h-3 bg-linear-to-r from-secondary to-accent
          transition-[top,transform,border-radius] duration-300 ease-spring
          ${open ? 'top-2 -rotate-45 rounded-sm' : 'top-3.5 rotate-0 rounded-b-full rounded-t-none'}`}
      />
    </div>
  )
}

/** Mobile menu state + Escape key / resize-to-desktop close handlers */
export function useMobileMenu() {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  useEffect(() => {
    if (!menuOpen) {
      return
    }
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [menuOpen, closeMenu])

  // Doit rester cale sur le breakpoint `lg` de Tailwind (64rem), celui qui pilote
  // les `lg:hidden` du menu mobile — sinon le menu reste ouvert en vue bureau.
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 64rem)')
    const handler = () => {
      if (desktop.matches) {
        closeMenu()
      }
    }
    handler()
    desktop.addEventListener('change', handler)
    return () => desktop.removeEventListener('change', handler)
  }, [closeMenu])

  return { menuOpen, setMenuOpen, closeMenu }
}

/** Backdrop + smooth slide-down wrapper for mobile menus */
export function MobileMenuShell({
  id,
  open,
  onClose,
  topOffset,
  children,
}: {
  id: string
  open: boolean
  onClose: () => void
  /** Hauteur de la barre fixe sous laquelle le panneau se déroule (ex. `var(--topbar-h)`).
      Doit correspondre à la navbar du contexte, sinon le haut du menu passe dessous. */
  topOffset: string
  children: ReactNode
}) {
  return (
    <>
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-40 lg:hidden bg-black/35 backdrop-blur-sm transition-opacity duration-300 ease-in ${
          open
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <div
        id={id}
        style={{ top: topOffset, maxHeight: `calc(100dvh - ${topOffset})` }}
        className={`fixed left-0 right-0 z-40 lg:hidden grid transition-[grid-template-rows] duration-[420ms] ease-spring-soft ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="max-h-full overflow-y-auto overscroll-contain bg-background/95 backdrop-blur-xl border-b border-border shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
            <div className="mx-auto max-w-7xl px-6 py-3 flex flex-col gap-0.5">
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/** Staggered mobile nav row with gradient dot — internal routes */
export function MobileNavLink({
  to,
  label,
  index,
  open,
  onClick,
  badgeCount,
  badgeTone,
  locked,
}: {
  to: string
  label: string
  index: number
  open: boolean
  onClick: () => void
  badgeCount?: number
  badgeTone?: BadgeTone
  locked?: boolean
}) {
  const { t } = useTranslation('notifications')
  return (
    <Link
      to={to as never}
      onClick={onClick}
      className={`flex items-center justify-between gap-4 px-2 py-3 rounded-xl text-text-light hover:text-text
        transition-[opacity,transform] duration-300 ease-spring-pop
        [&.active]:text-primary [&.active]:font-semibold
        ${open ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'}`}
      style={{ transitionDelay: staggerDelay(index) }}
    >
      <span className="flex items-center gap-4">
        <span
          className={`w-4 h-4 rounded-full shrink-0 bg-linear-to-br ${dotGradients[index % 3]}`}
        />
        <span className="flex items-center gap-2 text-3xl font-semibold uppercase tracking-wide">
          {label}
          {locked && <Lock className="h-3 w-3 text-text-light" />}
        </span>
      </span>
      <NotificationBadge
        shape="pill"
        tone={badgeTone ?? 'alert'}
        count={badgeCount ?? 0}
        ariaLabel={t('pendingAriaLabel', { count: badgeCount ?? 0 })}
      />
    </Link>
  )
}

/** Titre de section (non repliable) du menu mobile, animé comme les lignes */
export function MobileNavHeading({
  label,
  index,
  open,
}: {
  label: string
  index: number
  open: boolean
}) {
  return (
    <span
      className={`px-2 pt-4 pb-1 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-text-light/60
        transition-[opacity,transform] duration-300 ease-spring-pop
        ${open ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'}`}
      style={{ transitionDelay: staggerDelay(index) }}
    >
      {label}
    </span>
  )
}

/** Staggered mobile nav row with gradient dot — external links */
export function MobileNavAnchor({
  href,
  label,
  index,
  open,
  onClick,
}: {
  href: string
  label: string
  index: number
  open: boolean
  onClick: () => void
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={`flex items-center gap-4 px-2 py-3 rounded-xl text-text-light hover:text-text
        transition-[opacity,transform] duration-300 ease-spring-pop
        ${open ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'}`}
      style={{ transitionDelay: staggerDelay(index) }}
    >
      <span
        className={`w-4 h-4 rounded-full shrink-0 bg-linear-to-br ${dotGradients[index % 3]}`}
      />
      <span className="text-3xl font-semibold uppercase tracking-wide">
        {label}
      </span>
    </a>
  )
}

import { Link, useNavigate } from '@tanstack/react-router'
import { LogOut, Sparkles, Ticket } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useAuthStore } from '../../stores/auth.store'
import { RewardsBadge } from '../rewards/RewardsBadge.tsx'
import { Button } from '../ui/button.tsx'

const navItems = [
  { to: '/play', label: 'Jouer' },
  { to: '/collection', label: 'Collection' },
  { to: '/team', label: 'Équipes' },
  { to: '/shop', label: 'Boutique' },
  { to: '/upgrades', label: 'Améliorations' },
  { to: '/leaderboard', label: 'Classement' },
]

// Static delay strings for Tailwind JIT detection
const itemDelays = ['80ms', '125ms', '170ms', '215ms', '260ms', '305ms']

// Dot gradient per-item rotation
const dotGradients = [
  'from-primary-light to-primary',
  'from-secondary to-accent',
  'from-primary to-secondary',
]

// Capsule gachapon icon: two rounded halves that morph into ✕
function CapsuleIcon({ open }: { open: boolean }) {
  return (
    <div className="cursor-pointer relative w-6 h-6" aria-hidden="true">
      {/* Top half → top diagonal of ✕ */}
      <span
        className={`absolute inset-x-0 h-3 bg-linear-to-r from-primary-light to-primary
          transition-[top,transform,border-radius] duration-300 ease-spring
          ${open ? 'top-2 rotate-45 rounded-sm' : 'top-px rotate-0 rounded-t-full rounded-b-none'}`}
      />
      {/* Bottom half → bottom diagonal of ✕ */}
      <span
        className={`absolute inset-x-0 h-3 bg-linear-to-r from-secondary to-accent
          transition-[top,transform,border-radius] duration-300 ease-spring
          ${open ? 'top-2 -rotate-45 rounded-sm' : 'top-3.5 rotate-0 rounded-b-full rounded-t-none'}`}
      />
    </div>
  )
}

export function Navbar() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  const handleLogout = async () => {
    await logout()
    await navigate({ to: '/' })
  }

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
  }, [menuOpen])

  useEffect(() => {
    const handler = () => {
      if (window.innerWidth >= 1024) {
        closeMenu()
      }
    }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return (
    <>
      <nav className="fixed top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link
            to="/"
            className="flex items-center gap-2 shrink-0"
            onClick={closeMenu}
          >
            <span className="text-xl font-black bg-linear-to-r from-primary via-primary-light to-secondary bg-clip-text text-transparent">
              Gachapon
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="px-3 py-2 text-sm font-medium text-text-light rounded-lg transition-colors hover:text-text hover:bg-muted [&.active]:text-primary [&.active]:font-semibold"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <>
                <div className="flex items-center gap-2">
                  <Link
                    to="/shop"
                    className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Ticket className="h-3.5 w-3.5" />
                    {user.tokens.toLocaleString('fr-FR')}
                  </Link>
                  <Link
                    to="/shop"
                    className="flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-sm font-semibold text-accent hover:bg-accent/20 transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {user.dust.toLocaleString('fr-FR')}
                  </Link>
                </div>
                <RewardsBadge
                  pendingRewardsCount={user.pendingRewardsCount ?? 0}
                />
                <div className="h-5 w-px bg-border hidden lg:block" />
                <Link
                  to={'/profile/$username'}
                  params={{ username: user.username }}
                  className="hidden lg:flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary text-xs font-bold text-white ring-2 ring-primary/20 hover:ring-primary/50 transition-all"
                >
                  {user.username[0]?.toUpperCase()}
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void handleLogout()}
                  title="Déconnexion"
                  className="hidden lg:flex text-text-light hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Capsule burger — mobile/tablet only */}
            <button
              type="button"
              aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              className="relative lg:hidden flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <CapsuleIcon open={menuOpen} />
            </button>
          </div>
        </div>
      </nav>

      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-40 lg:hidden bg-black/35 backdrop-blur-sm transition-opacity duration-300 ease-in ${
          menuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMenu}
      />

      {/* Mobile menu — grid-rows trick for smooth height animation */}
      <div
        id="mobile-menu"
        className={`fixed top-16 left-0 right-0 z-40 lg:hidden grid transition-[grid-template-rows] duration-[420ms] ease-spring-soft ${
          menuOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="bg-background/95 backdrop-blur-xl border-b border-border shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
            <div className="mx-auto max-w-7xl px-6 py-3 flex flex-col gap-0.5">
              {navItems.map((item, i) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={closeMenu}
                  className={`flex items-center gap-4 px-2 py-3 rounded-xl text-text-light hover:text-text
                    transition-[opacity,transform] duration-300 ease-spring-pop
                    [&.active]:text-primary [&.active]:font-semibold
                    ${menuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'}`}
                  style={{ transitionDelay: itemDelays[i] }}
                >
                  <span
                    className={`w-4 h-4 rounded-full shrink-0 bg-linear-to-br ${dotGradients[i % 3]}`}
                  />
                  <span className="text-3xl font-semibold uppercase tracking-wide">
                    {item.label}
                  </span>
                </Link>
              ))}

              {user && (
                <div
                  className={`mt-1 pt-1 border-t border-border/60 flex items-center justify-between transition-opacity duration-300 ${menuOpen ? 'opacity-100' : 'opacity-0'}`}
                  style={{ transitionDelay: `${navItems.length * 45 + 120}ms` }}
                >
                  <Link
                    to={'/profile/$username'}
                    params={{ username: user.username }}
                    className="px-2 py-3 text-3xl font-semibold uppercase tracking-wide text-text-light hover:text-text transition-colors"
                    onClick={closeMenu}
                  >
                    {user.username}
                  </Link>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      void handleLogout()
                      closeMenu()
                    }}
                    title="Déconnexion"
                    className="p-2 rounded-full hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="font-semibold text-text-light h-7 w-7" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

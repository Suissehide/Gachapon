import { Link, useNavigate } from '@tanstack/react-router'
import { Bot, ChevronDown, LogOut, Plug, ScrollText } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useAuthStore } from '../../stores/auth.store'
import { useAuthDialogStore } from '../../stores/authDialog.store'
import { AuthDialog } from '../auth'
import { Button } from '../ui/button'
import {
  CapsuleIcon,
  MobileMenuShell,
  MobileNavAnchor,
  MobileNavLink,
  useMobileMenu,
} from './MobileMenu.tsx'

const NAV_ITEMS = [
  { to: '/guide' as const, label: 'Guide du joueur' },
  { to: '/stats' as const, label: 'Statistiques' },
  { to: '/about' as const, label: 'À propos' },
]

const RESSOURCES_ITEMS = [
  {
    icon: Plug,
    label: 'Référence API',
    desc: 'Documentation OpenAPI interactive',
    to: '/api-docs' as const,
  },
  {
    icon: Bot,
    label: 'Intégration Discord',
    desc: "Créer un bot avec l'API Gachapon",
    to: '/discord' as const,
  },
  {
    icon: ScrollText,
    label: 'Changelog',
    desc: 'Historique des mises à jour et nouvelles cartes',
    to: '/changelog' as const,
  },
]

const ALL_MOBILE_ITEMS_COUNT = NAV_ITEMS.length + RESSOURCES_ITEMS.length

export function LandingNavbar() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const [ressourcesOpen, setRessourcesOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const {
    open: dialogOpen,
    tab: defaultTab,
    openLogin,
    openRegister,
    setOpen: setDialogOpen,
  } = useAuthDialogStore()

  const { menuOpen, setMenuOpen, closeMenu } = useMobileMenu()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setRessourcesOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-background/80 backdrop-blur-xl border-b border-border/40 animate-in fade-in-0 slide-in-from-top-2 duration-500 fill-mode-both">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          {/* Left: logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="text-xl font-black bg-linear-to-r from-primary via-primary-light to-secondary bg-clip-text text-transparent">
              Gachapon
            </span>
          </Link>

          {/* Center: nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            <Link
              to="/guide"
              className="px-3 py-2 text-sm font-medium text-text-light rounded-lg transition-colors hover:text-text hover:bg-muted [&.active]:text-primary [&.active]:font-semibold"
            >
              Guide du joueur
            </Link>

            <Link
              to="/stats"
              className="px-3 py-2 text-sm font-medium text-text-light rounded-lg transition-colors hover:text-text hover:bg-muted [&.active]:text-primary [&.active]:font-semibold"
            >
              Statistiques
            </Link>

            {/* Ressources dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setRessourcesOpen((o) => !o)}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-text-light rounded-lg transition-colors hover:text-text hover:bg-muted"
              >
                Ressources
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${ressourcesOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {ressourcesOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 rounded-xl border border-border bg-background/95 backdrop-blur-xl shadow-xl p-2 animate-in fade-in-0 slide-in-from-top-2 duration-150">
                  {RESSOURCES_ITEMS.map(({ icon: Icon, label, desc, to }) => (
                    <Link
                      key={label}
                      to={to}
                      onClick={() => setRessourcesOpen(false)}
                      className="flex items-start gap-3 rounded-lg px-3 py-3 hover:bg-muted transition-colors group"
                    >
                      <Icon className="h-4 w-4 mt-0.5 text-text-light group-hover:text-primary transition-colors shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{label}</p>
                        <p className="text-xs text-text-light mt-0.5">{desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link
              to="/about"
              className="px-3 py-2 text-sm font-medium text-text-light rounded-lg transition-colors hover:text-text hover:bg-muted [&.active]:text-primary [&.active]:font-semibold"
            >
              À propos
            </Link>

            <a
              href="https://discord.gg/my-gachapon"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 text-sm font-medium text-text-light rounded-lg transition-colors hover:text-text hover:bg-muted"
            >
              Communauté
            </a>
          </nav>

          {/* Right: CTA + auth */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <>
                <Button
                  onClick={() => void navigate({ to: '/play' })}
                  className="hidden lg:flex rounded-full h-9 text-sm px-5 shadow-sm shadow-primary/20"
                >
                  Jouer →
                </Button>
                <div className="hidden lg:block h-5 w-px bg-border" />
                <div className="hidden lg:flex items-center gap-3">
                  <Link
                    to="/profile/$username"
                    params={{ username: user.username }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary text-xs font-bold text-white ring-2 ring-primary/20 hover:ring-primary/50 transition-all"
                  >
                    {user.username[0]?.toUpperCase()}
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void logout().then(() => navigate({ to: '/' }))}
                    title="Déconnexion"
                    className="text-text-light hover:text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={openLogin}
                  className="text-sm text-text-light hidden lg:flex"
                >
                  Se connecter
                </Button>
                <Button
                  onClick={openRegister}
                  className="hidden lg:flex rounded-full h-9 text-sm px-5 shadow-sm shadow-primary/20"
                >
                  S'inscrire →
                </Button>
              </>
            )}

            {/* Capsule burger — mobile only */}
            <button
              type="button"
              aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={menuOpen}
              aria-controls="landing-mobile-menu"
              className="relative lg:hidden flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <CapsuleIcon open={menuOpen} />
            </button>
          </div>
        </div>
      </header>

      <MobileMenuShell id="landing-mobile-menu" open={menuOpen} onClose={closeMenu}>
        {NAV_ITEMS.map((item, i) => (
          <MobileNavLink
            key={item.to}
            to={item.to}
            label={item.label}
            index={i}
            open={menuOpen}
            onClick={closeMenu}
          />
        ))}

        {RESSOURCES_ITEMS.map(({ label, to }, i) => (
          <MobileNavLink
            key={label}
            to={to}
            label={label}
            index={NAV_ITEMS.length + i}
            open={menuOpen}
            onClick={closeMenu}
          />
        ))}

        <MobileNavAnchor
          href="https://discord.gg/my-gachapon"
          label="Communauté"
          index={ALL_MOBILE_ITEMS_COUNT}
          open={menuOpen}
          onClick={closeMenu}
        />

        {/* Auth section */}
        <div
          className={`mt-1 pt-1 border-t border-border/60 flex items-center justify-between transition-opacity duration-300 ${menuOpen ? 'opacity-100' : 'opacity-0'}`}
          style={{ transitionDelay: '350ms' }}
        >
          {isAuthenticated && user ? (
            <>
              <Link
                to="/profile/$username"
                params={{ username: user.username }}
                className="px-2 py-3 text-3xl font-semibold uppercase tracking-wide text-text-light hover:text-text transition-colors"
                onClick={closeMenu}
              >
                {user.username}
              </Link>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    void navigate({ to: '/play' })
                    closeMenu()
                  }}
                  className="rounded-full h-9 text-sm px-5 shadow-sm shadow-primary/20"
                >
                  Jouer →
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    void logout().then(() => navigate({ to: '/' }))
                    closeMenu()
                  }}
                  title="Déconnexion"
                  className="p-2 rounded-full hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="font-semibold text-text-light h-7 w-7" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex w-full items-center gap-3 px-2 py-2">
              <Button
                variant="ghost"
                onClick={() => {
                  openLogin()
                  closeMenu()
                }}
                className="flex-1 text-sm"
              >
                Se connecter
              </Button>
              <Button
                onClick={() => {
                  openRegister()
                  closeMenu()
                }}
                className="flex-1 rounded-full text-sm shadow-sm shadow-primary/20"
              >
                S'inscrire →
              </Button>
            </div>
          )}
        </div>
      </MobileMenuShell>

      <AuthDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultTab={defaultTab}
      />
    </>
  )
}

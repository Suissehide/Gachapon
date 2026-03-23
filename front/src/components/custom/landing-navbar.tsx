import { Link, useNavigate } from '@tanstack/react-router'
import { Bot, ChevronDown, LogOut, Plug, ScrollText } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useAuthStore } from '../../stores/auth.store'
import { Button } from '../ui/button'

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

interface LandingNavbarProps {
  onOpenLogin: () => void
  onOpenRegister: () => void
}

export function LandingNavbar({
  onOpenLogin,
  onOpenRegister,
}: LandingNavbarProps) {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const [ressourcesOpen, setRessourcesOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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
    <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-background/80 backdrop-blur-xl border-b border-border/40 animate-in fade-in-0 slide-in-from-top-2 duration-500 fill-mode-both">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        {/* Left: logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="text-xl font-black bg-linear-to-r from-primary via-primary-light to-secondary bg-clip-text text-transparent">
            Gachapon
          </span>
        </Link>

        {/* Center: nav */}
        <nav className="hidden items-center gap-1 md:flex">
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
                      <p className="text-sm font-semibold text-foreground">
                        {label}
                      </p>
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
                className="rounded-full h-9 text-sm px-5 shadow-sm shadow-primary/20"
              >
                Jouer →
              </Button>
              <div className="h-5 w-px bg-border" />
              <div className="flex items-center gap-3">
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
                  onClick={() =>
                    void logout().then(() => navigate({ to: '/' }))
                  }
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
                onClick={onOpenLogin}
                className="text-sm text-text-light hidden sm:flex"
              >
                Se connecter
              </Button>
              <Button
                onClick={onOpenRegister}
                className="rounded-full h-9 text-sm px-5 shadow-sm shadow-primary/20"
              >
                S'inscrire →
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

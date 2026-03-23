import { Link, useNavigate } from '@tanstack/react-router'
import { LogOut, Sparkles, Ticket } from 'lucide-react'

import { useAuthStore } from '../../stores/auth.store'
import { Button } from '../ui/button.tsx'

const navItems = [
  { to: '/play', label: 'Jouer' },
  { to: '/collection', label: 'Collection' },
  { to: '/teams', label: 'Équipes' },
  { to: '/shop', label: 'Boutique' },
  { to: '/upgrades', label: 'Améliorations' },
  { to: '/leaderboard', label: 'Classement' },
]

export function Navbar() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    await navigate({ to: '/' })
  }

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="text-xl font-black bg-gradient-to-r from-primary via-primary-light to-secondary bg-clip-text text-transparent">
            Gachapon
          </span>
        </Link>

        <div className="hidden items-center md:flex">
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
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                <Ticket className="h-3.5 w-3.5" />
                {user.tokens.toLocaleString('fr-FR')}
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-sm font-semibold text-accent">
                <Sparkles className="h-3.5 w-3.5" />
                {user.dust.toLocaleString('fr-FR')}
              </span>
            </div>
          )}
          {user && <div className="h-5 w-px bg-border" />}
          {user && (
            <Link
              to={'/profile/$username'}
              params={{ username: user.username }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-xs font-bold text-white ring-2 ring-primary/20 hover:ring-primary/50 transition-all"
            >
              {user.username[0]?.toUpperCase()}
            </Link>
          )}
          {user && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void handleLogout()}
              title="Déconnexion"
              className="text-text-light hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </nav>
  )
}

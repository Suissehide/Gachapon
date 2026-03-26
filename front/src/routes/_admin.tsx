import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useRouterState,
} from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  BarChart2,
  ChevronRight,
  Flame,
  Images,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'

import { useAuthStore } from '../stores/auth.store'

export const Route = createFileRoute('/_admin')({
  beforeLoad: () => {
    const user = useAuthStore.getState().user
    if (!user || user.role !== 'SUPER_ADMIN') {
      throw redirect({ to: '/' })
    }
  },
  component: AdminLayout,
})

type NavItem = { to: string; label: string; icon: LucideIcon; exact?: boolean }

const NAV_ITEMS: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/users', label: 'Joueurs', icon: Users },
  { to: '/admin/cards', label: 'Cartes', icon: Package },
  { to: '/admin/media', label: 'Médias', icon: Images },
  { to: '/admin/shop', label: 'Boutique', icon: ShoppingBag },
  { to: '/admin/upgrades', label: 'Améliorations', icon: Zap },
  { to: '/admin/scoring', label: 'Scoring', icon: Trophy },
  { to: '/admin/config', label: 'Config', icon: Settings },
  { to: '/admin/streak', label: 'Streak', icon: Flame },
  { to: '/admin/stats', label: 'Stats', icon: BarChart2 },
]

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <aside className="flex h-full w-56 flex-col border-r border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <span className="text-xs font-black uppercase tracking-widest text-primary">
            Admin
          </span>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => {
            const active = exact ? pathname === to : pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to as '/admin'}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary/20 text-primary'
                    : 'text-text-light hover:bg-surface hover:text-text'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {active && <ChevronRight className="ml-auto h-3 w-3" />}
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto border-t border-border p-3">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-text-light transition-colors hover:bg-surface hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au site
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

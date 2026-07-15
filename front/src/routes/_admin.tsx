import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useRouterState,
} from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  ArrowLeft,
  BarChart2,
  ChevronRight,
  Flame,
  Images,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  Swords,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'

import { cn } from '../libs/utils'
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
type NavSection = { label: string | null; items: NavItem[] }

const NAV_SECTIONS: NavSection[] = [
  {
    label: null,
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: 'Contenu',
    items: [
      { to: '/admin/cards', label: 'Cartes', icon: Package },
      { to: '/admin/media', label: 'Médias', icon: Images },
      { to: '/admin/shop', label: 'Boutique', icon: ShoppingBag },
    ],
  },
  {
    label: 'Économie',
    items: [
      { to: '/admin/config', label: 'Config', icon: Settings },
      { to: '/admin/scoring', label: 'Scoring', icon: Trophy },
      { to: '/admin/streak', label: 'Streak', icon: Flame },
      { to: '/admin/skills', label: 'Compétences', icon: Zap },
    ],
  },
  {
    label: 'Joueurs',
    items: [
      { to: '/admin/users', label: 'Joueurs', icon: Users },
      { to: '/admin/stats', label: 'Stats', icon: BarChart2 },
    ],
  },
  {
    label: 'Système',
    items: [
      { to: '/admin/health', label: 'Santé', icon: Activity },
      { to: '/admin/combat-debug', label: 'Combat — Debug', icon: Swords },
    ],
  },
]

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <aside className="flex h-full w-56 flex-col border-r border-border bg-card">
        <div className="h-14 border-b border-border px-5 py-4">
          <span className="text-xs font-black uppercase tracking-widest text-primary">
            Admin
          </span>
        </div>
        <nav className="flex flex-col gap-4 overflow-y-auto p-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label ?? 'root'} className="flex flex-col gap-1">
              {section.label && (
                <span className="px-3 pb-1 text-[10px] font-black uppercase tracking-widest text-text-light/60">
                  {section.label}
                </span>
              )}
              {section.items.map(({ to, label, icon: Icon, exact }) => {
                const active = exact ? pathname === to : pathname.startsWith(to)
                return (
                  <Link
                    key={to}
                    to={to as '/admin'}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary/20 text-primary'
                        : 'text-text-light hover:bg-surface hover:text-text',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                    {active && <ChevronRight className="ml-auto h-3 w-3" />}
                  </Link>
                )
              })}
            </div>
          ))}
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

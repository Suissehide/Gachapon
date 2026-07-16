import { createFileRoute, Link } from '@tanstack/react-router'
import {
  BarChart2,
  Coins,
  Crown,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react'

import type { AdminStatsApi } from '../../api/admin-stats.api.ts'
import { ActivityFeed } from '../../components/admin/ActivityFeed'
import { PullsChart } from '../../components/admin/PullsChart'
import { AdminPageHeader } from '../../components/admin/shared/AdminPageHeader.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Card, CardContent } from '../../components/ui/card.tsx'
import { useAdminDashboard } from '../../queries/useAdminStats'

type DashboardKpis = Awaited<
  ReturnType<typeof AdminStatsApi.getDashboard>
>['kpis']

export const Route = createFileRoute('/_admin/admin/')({
  component: AdminDashboard,
})

const KPI_META = [
  {
    key: 'totalUsers' as const,
    label: 'Utilisateurs',
    icon: Users,
    color: 'text-accent',
    bg: 'bg-accent/10',
    sub: 'comptes enregistrés',
  },
  {
    key: 'pullsToday' as const,
    label: "Pulls aujourd'hui",
    icon: Coins,
    color: 'text-primary',
    bg: 'bg-primary/10',
    sub: 'tirages du jour',
  },
  {
    key: 'dustGenerated' as const,
    label: 'Poussière générée',
    icon: Sparkles,
    color: 'text-secondary',
    bg: 'bg-secondary/10',
    sub: 'total cumulé',
  },
  {
    key: 'legendaryCount' as const,
    label: 'Légendaires',
    icon: Crown,
    color: 'text-primary',
    bg: 'bg-primary/10',
    sub: 'cartes tirées',
  },
  {
    key: 'signups30d' as const,
    label: 'Inscriptions (30j)',
    icon: UserPlus,
    color: 'text-success',
    bg: 'bg-success/10',
    sub: (kpis: DashboardKpis) =>
      `7 derniers jours : ${kpis.signups7d.toLocaleString('fr-FR')}`,
  },
  {
    key: 'activeUsers7d' as const,
    label: 'Actifs (7j)',
    icon: Users,
    color: 'text-info',
    bg: 'bg-info/10',
    sub: (kpis: DashboardKpis) =>
      `30 j : ${kpis.activeUsers30d.toLocaleString('fr-FR')}`,
  },
  {
    key: 'dustSpent' as const,
    label: 'Poussière dépensée',
    icon: Sparkles,
    color: 'text-warning',
    bg: 'bg-warning/10',
    sub: 'boutique',
  },
  {
    key: 'totalPulls' as const,
    label: 'Pulls (total)',
    icon: Coins,
    color: 'text-primary',
    bg: 'bg-primary/10',
    sub: 'tous les temps',
  },
]

function AdminDashboard() {
  const { data, isLoading } = useAdminDashboard()

  return (
    <div className="relative min-h-full p-8">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 left-1/3 h-72 w-72 rounded-full bg-primary/6 blur-[90px]" />
        <div className="absolute bottom-32 right-1/4 h-56 w-56 rounded-full bg-secondary/5 blur-[80px]" />
      </div>

      <div className="relative">
        <AdminPageHeader
          icon={TrendingUp}
          kicker="Vue d'ensemble"
          title="Dashboard"
          subtitle="Activité et indicateurs clés de la plateforme"
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/stats">
                <BarChart2 className="h-4 w-4" />
                Stats détaillées
              </Link>
            </Button>
          }
        />

        {/* KPI Cards — 4 colonnes sur 2 rangées */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {KPI_META.map(({ key, label, icon: Icon, color, bg, sub }) => (
            <Card key={key} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="mb-2 flex items-center gap-2">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-md ${bg}`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${color}`} />
                  </div>
                  <p className="text-xs font-semibold text-text-light">
                    {label}
                  </p>
                </div>
                {isLoading || !data ? (
                  <div className="h-7 w-20 animate-pulse rounded bg-border" />
                ) : (
                  <p className="text-2xl font-black text-text">
                    {data.kpis[key].toLocaleString('fr-FR')}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-text-light/70">
                  {typeof sub === 'function' && data
                    ? sub(data.kpis)
                    : typeof sub === 'string'
                      ? sub
                      : ''}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main layout: charts left, activity feed right */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
          {/* Left column: charts */}
          <div className="flex flex-col gap-6">
            {/* Pulls chart */}
            {isLoading || !data ? (
              <Card>
                <CardContent className="p-5">
                  <div className="mb-4 h-4 w-48 animate-pulse rounded bg-border" />
                  <div className="h-[200px] animate-pulse rounded-lg bg-border" />
                </CardContent>
              </Card>
            ) : (
              <PullsChart data={data.pullsSeries} />
            )}

            {/* Signups chart */}
            {isLoading || !data ? (
              <Card>
                <CardContent className="p-5">
                  <div className="mb-4 h-4 w-48 animate-pulse rounded bg-border" />
                  <div className="h-[200px] animate-pulse rounded-lg bg-border" />
                </CardContent>
              </Card>
            ) : (
              <PullsChart
                data={data.signupsSeries}
                title="Inscriptions / jour"
                color="var(--success)"
                unit="inscriptions"
              />
            )}
          </div>

          {/* Right column: activity feed */}
          <div>
            <ActivityFeed />
          </div>
        </div>
      </div>
    </div>
  )
}

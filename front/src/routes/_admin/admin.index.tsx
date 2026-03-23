import { createFileRoute, Link } from '@tanstack/react-router'
import {
  BarChart2,
  Crown,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
} from 'lucide-react'

import { PullsChart } from '../../components/admin/PullsChart'
import { Button } from '../../components/ui/button.tsx'
import { Card, CardContent } from '../../components/ui/card.tsx'
import { useAdminDashboard } from '../../queries/useAdminStats'

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
    icon: Ticket,
    color: 'text-primary',
    bg: 'bg-primary/10',
    sub: 'tirages du jour',
  },
  {
    key: 'dustGenerated' as const,
    label: 'Dust généré',
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
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-primary">
                Vue d'ensemble
              </span>
            </div>
            <h1 className="text-3xl font-black text-text">Dashboard</h1>
            <p className="mt-1 text-sm text-text-light">
              Activité et indicateurs clés de la plateforme
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/stats">
              <BarChart2 className="h-4 w-4" />
              Stats détaillées
            </Link>
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="mb-8 grid grid-cols-4 gap-3 lg:grid-cols-4">
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
                <p className="mt-0.5 text-xs text-text-light/70">{sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pulls chart */}
        <div className="mb-8">
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
        </div>
      </div>
    </div>
  )
}

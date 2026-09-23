import { createFileRoute, Link } from '@tanstack/react-router'
import type { TFunction } from 'i18next'
import {
  BarChart2,
  Crown,
  Sparkles,
  Ticket,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { AdminStatsApi } from '../../api/admin-stats.api.ts'
import { ActivityFeed } from '../../components/admin/ActivityFeed'
import { PullsChart } from '../../components/admin/PullsChart'
import { AdminPageHeader } from '../../components/admin/shared/AdminPageHeader.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Card, CardContent } from '../../components/ui/card.tsx'
import { currentLocale } from '../../i18n/index.ts'
import { formatNumber } from '../../libs/utils.ts'
import { useAdminDashboard } from '../../queries/useAdminStats'

type DashboardKpis = Awaited<
  ReturnType<typeof AdminStatsApi.getDashboard>
>['kpis']

export const Route = createFileRoute('/_admin/admin/')({
  component: AdminDashboard,
})

function buildKpiMeta(
  t: TFunction<'admin'>,
  locale: ReturnType<typeof currentLocale>,
) {
  return [
    {
      key: 'totalUsers' as const,
      label: t('index.kpi.totalUsers.label'),
      icon: Users,
      color: 'text-accent',
      bg: 'bg-accent/10',
      sub: t('index.kpi.totalUsers.sub'),
    },
    {
      key: 'pullsToday' as const,
      label: t('index.kpi.pullsToday.label'),
      icon: Ticket,
      color: 'text-primary',
      bg: 'bg-primary/10',
      sub: t('index.kpi.pullsToday.sub'),
    },
    {
      key: 'dustGenerated' as const,
      label: t('index.kpi.dustGenerated.label'),
      icon: Sparkles,
      color: 'text-secondary',
      bg: 'bg-secondary/10',
      sub: t('index.kpi.dustGenerated.sub'),
    },
    {
      key: 'legendaryCount' as const,
      label: t('index.kpi.legendaryCount.label'),
      icon: Crown,
      color: 'text-primary',
      bg: 'bg-primary/10',
      sub: t('index.kpi.legendaryCount.sub'),
    },
    {
      key: 'signups30d' as const,
      label: t('index.kpi.signups30d.label'),
      icon: UserPlus,
      color: 'text-success',
      bg: 'bg-success/10',
      sub: (kpis: DashboardKpis) =>
        t('index.kpi.signups30d.sub', {
          value: formatNumber(kpis.signups7d, locale),
        }),
    },
    {
      key: 'activeUsers7d' as const,
      label: t('index.kpi.activeUsers7d.label'),
      icon: Users,
      color: 'text-info',
      bg: 'bg-info/10',
      sub: (kpis: DashboardKpis) =>
        t('index.kpi.activeUsers7d.sub', {
          value: formatNumber(kpis.activeUsers30d, locale),
        }),
    },
    {
      key: 'dustSpent' as const,
      label: t('index.kpi.dustSpent.label'),
      icon: Sparkles,
      color: 'text-warning',
      bg: 'bg-warning/10',
      sub: t('index.kpi.dustSpent.sub'),
    },
    {
      key: 'totalPulls' as const,
      label: t('index.kpi.totalPulls.label'),
      icon: Ticket,
      color: 'text-primary',
      bg: 'bg-primary/10',
      sub: t('index.kpi.totalPulls.sub'),
    },
  ]
}

function AdminDashboard() {
  const { t } = useTranslation('admin')
  const locale = currentLocale()
  const { data, isLoading } = useAdminDashboard()
  const kpiMeta = useMemo(() => buildKpiMeta(t, locale), [t, locale])

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
          kicker={t('common.kicker.overview')}
          title={t('index.pageTitle')}
          subtitle={t('index.pageSubtitle')}
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/stats">
                <BarChart2 className="h-4 w-4" />
                {t('index.statsButton')}
              </Link>
            </Button>
          }
        />

        {/* KPI Cards — 4 colonnes sur 2 rangées */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kpiMeta.map(({ key, label, icon: Icon, color, bg, sub }) => (
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
                    {formatNumber(data.kpis[key], locale)}
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
                title={t('index.signupsChartTitle')}
                color="var(--success)"
                unit={t('index.signupsUnit')}
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

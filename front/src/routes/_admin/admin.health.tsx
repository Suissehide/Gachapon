import { createFileRoute } from '@tanstack/react-router'
import dayjs from 'dayjs'
import type { TFunction } from 'i18next'
import { Activity, Database, HardDrive, Radio, Server } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AdminPageHeader } from '../../components/admin/shared/AdminPageHeader'
import { Badge, type BadgeVariant } from '../../components/ui/badge.tsx'
import { Card, CardContent } from '../../components/ui/card.tsx'
import { useAdminHealth } from '../../queries/useAdminHealth'

export const Route = createFileRoute('/_admin/admin/health')({
  component: AdminHealth,
})

function buildStatusMeta(
  t: TFunction<'admin'>,
): Record<
  'ok' | 'degraded' | 'down',
  { variant: BadgeVariant; label: string }
> {
  return {
    ok: { variant: 'success', label: t('health.statusOk') },
    degraded: { variant: 'warning', label: t('health.statusDegraded') },
    down: { variant: 'danger', label: t('health.statusDown') },
  }
}

function buildServices(t: TFunction<'admin'>) {
  return [
    {
      key: 'postgres' as const,
      label: t('health.services.postgres'),
      icon: Database,
    },
    { key: 'redis' as const, label: t('health.services.redis'), icon: Server },
    {
      key: 'storage' as const,
      label: t('health.services.storage'),
      icon: HardDrive,
    },
  ]
}

const formatUptime = (t: TFunction<'admin'>, seconds: number) => {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) {
    return t('health.uptimeDays', { d, h, m })
  }
  return h > 0
    ? t('health.uptimeHours', { h, m })
    : t('health.uptimeMinutes', { m })
}

const formatMb = (t: TFunction<'admin'>, bytes: number) =>
  t('health.mbUnit', { value: Math.round(bytes / 1024 / 1024) })

function AdminHealth() {
  const { t } = useTranslation('admin')
  const { data, isLoading, dataUpdatedAt } = useAdminHealth()
  const statusMeta = buildStatusMeta(t)
  const services = buildServices(t)

  return (
    <div className="min-h-full p-8">
      <AdminPageHeader
        icon={Activity}
        kicker={t('common.kicker.system')}
        title={t('health.pageTitle')}
        subtitle={
          dataUpdatedAt
            ? t('health.lastCheck', {
                time: dayjs(dataUpdatedAt).format('LT'),
              })
            : t('health.checking')
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        {services.map(({ key, label, icon: Icon }) => {
          const svc = data?.services[key]
          const meta = svc ? statusMeta[svc.status] : null
          return (
            <Card key={key}>
              <CardContent className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-text-light" />
                    <p className="text-sm font-bold text-text">{label}</p>
                  </div>
                  {isLoading || !meta ? (
                    <div className="h-5 w-20 animate-pulse rounded-full bg-border" />
                  ) : (
                    <Badge variant={meta.variant} size="sm">
                      {meta.label}
                    </Badge>
                  )}
                </div>
                <p className="text-2xl font-black text-text">
                  {svc ? `${svc.latencyMs} ms` : '—'}
                </p>
                <p className="text-xs text-text-light">
                  {t('health.pingLatency')}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="mb-2 flex items-center gap-2">
              <Radio className="h-4 w-4 text-text-light" />
              <p className="text-sm font-bold text-text">
                {t('health.websocket')}
              </p>
            </div>
            <p className="text-2xl font-black text-text">
              {data?.ws.connections ?? '—'}
            </p>
            <p className="text-xs text-text-light">
              {t('health.activeConnections')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="mb-2 text-sm font-bold text-text">
              {t('health.uptime')}
            </p>
            <p className="text-2xl font-black text-text">
              {data ? formatUptime(t, data.process.uptimeSeconds) : '—'}
            </p>
            <p className="text-xs text-text-light">
              {t('health.sinceLastRestart')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="mb-2 text-sm font-bold text-text">
              {t('health.nodeMemory')}
            </p>
            <p className="text-2xl font-black text-text">
              {data ? formatMb(t, data.process.memory.heapUsed) : '—'}
            </p>
            <p className="text-xs text-text-light">
              {t('health.heapUsedRss', {
                rss: data ? formatMb(t, data.process.memory.rss) : '—',
              })}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

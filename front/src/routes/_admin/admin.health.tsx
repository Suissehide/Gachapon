import { createFileRoute } from '@tanstack/react-router'
import { Activity, Database, HardDrive, Radio, Server } from 'lucide-react'

import { AdminPageHeader } from '../../components/admin/shared/AdminPageHeader'
import { Badge, type BadgeVariant } from '../../components/ui/badge.tsx'
import { Card, CardContent } from '../../components/ui/card.tsx'
import { useAdminHealth } from '../../queries/useAdminHealth'

export const Route = createFileRoute('/_admin/admin/health')({
  component: AdminHealth,
})

const STATUS_META: Record<string, { variant: BadgeVariant; label: string }> = {
  ok: { variant: 'success', label: 'Opérationnel' },
  degraded: { variant: 'warning', label: 'Dégradé' },
  down: { variant: 'danger', label: 'Hors service' },
}

const SERVICES = [
  { key: 'postgres' as const, label: 'PostgreSQL', icon: Database },
  { key: 'redis' as const, label: 'Redis', icon: Server },
  { key: 'storage' as const, label: 'MinIO (stockage)', icon: HardDrive },
]

const formatUptime = (seconds: number) => {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return d > 0 ? `${d}j ${h}h ${m}min` : h > 0 ? `${h}h ${m}min` : `${m}min`
}

const formatMb = (bytes: number) => `${Math.round(bytes / 1024 / 1024)} Mo`

function AdminHealth() {
  const { data, isLoading, dataUpdatedAt } = useAdminHealth()

  return (
    <div className="min-h-full p-8">
      <AdminPageHeader
        icon={Activity}
        kicker="Système"
        title="Santé système"
        subtitle={
          dataUpdatedAt
            ? `Dernière vérification : ${new Date(dataUpdatedAt).toLocaleTimeString('fr-FR')} — rafraîchi toutes les 15 s`
            : 'Vérification en cours…'
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        {SERVICES.map(({ key, label, icon: Icon }) => {
          const svc = data?.services[key]
          const meta = svc ? STATUS_META[svc.status] : null
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
                <p className="text-xs text-text-light">latence du ping</p>
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
              <p className="text-sm font-bold text-text">WebSocket</p>
            </div>
            <p className="text-2xl font-black text-text">
              {data?.ws.connections ?? '—'}
            </p>
            <p className="text-xs text-text-light">connexions actives</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="mb-2 text-sm font-bold text-text">Uptime</p>
            <p className="text-2xl font-black text-text">
              {data ? formatUptime(data.process.uptimeSeconds) : '—'}
            </p>
            <p className="text-xs text-text-light">
              depuis le dernier redémarrage
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="mb-2 text-sm font-bold text-text">Mémoire Node</p>
            <p className="text-2xl font-black text-text">
              {data ? formatMb(data.process.memory.heapUsed) : '—'}
            </p>
            <p className="text-xs text-text-light">
              heap utilisé — RSS{' '}
              {data ? formatMb(data.process.memory.rss) : '—'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

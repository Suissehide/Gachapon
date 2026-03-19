import { createFileRoute } from '@tanstack/react-router'

import { PullsChart } from '../../components/admin/PullsChart'
import { StatCard } from '../../components/admin/StatCard'
import { useAdminDashboard } from '../../queries/useAdminStats'

export const Route = createFileRoute('/_admin/admin/')({
  component: AdminDashboard,
})

function AdminDashboard() {
  const { data, isLoading } = useAdminDashboard()

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center text-text-light">
        Chargement…
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-black text-text">Dashboard</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Utilisateurs"
          value={data.kpis.totalUsers.toLocaleString()}
        />
        <StatCard
          label="Pulls aujourd'hui"
          value={data.kpis.pullsToday.toLocaleString()}
        />
        <StatCard
          label="Dust généré"
          value={data.kpis.dustGenerated.toLocaleString()}
          sub="total cumulé"
        />
        <StatCard
          label="Légendaires tirés"
          value={data.kpis.legendaryCount.toLocaleString()}
        />
      </div>

      <PullsChart data={data.pullsSeries} />
    </div>
  )
}

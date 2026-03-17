// front/src/routes/_admin/admin.stats.tsx
import { createFileRoute } from '@tanstack/react-router'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { AdminTable } from '../../components/admin/AdminTable'
import { useAdminStats } from '../../queries/useAdminStats'

export const Route = createFileRoute('/_admin/admin/stats')({
  component: AdminStats,
})

const RARITY_COLORS: Record<string, string> = {
  COMMON: '#9ca3af', UNCOMMON: '#4ade80', RARE: '#60a5fa', EPIC: '#c084fc', LEGENDARY: '#fbbf24',
}

function AdminStats() {
  const { data, isLoading } = useAdminStats()

  if (isLoading || !data) {
    return <div className="flex h-64 items-center justify-center text-text-light">Chargement…</div>
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-black text-text">Statistiques</h1>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-light">Distribution raretés</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data.rarityDistribution} dataKey="count" nameKey="rarity" cx="50%" cy="50%" outerRadius={80}>
                {data.rarityDistribution.map((entry) => (
                  <Cell key={entry.rarity} fill={RARITY_COLORS[entry.rarity] ?? '#6b7280'} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-light">Top 10 cartes</p>
          <AdminTable
            columns={[
              { key: 'name', header: 'Carte' },
              { key: 'rarity', header: 'Rareté' },
              { key: 'count', header: 'Tirages' },
            ]}
            rows={data.topCards.map((c) => ({ ...c, id: c.cardId }))}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-light">Top 10 joueurs</p>
        <AdminTable
          columns={[
            { key: 'username', header: 'Joueur' },
            { key: 'count', header: 'Pulls' },
          ]}
          rows={data.topUsers.map((u) => ({ ...u, id: u.userId }))}
        />
      </div>
    </div>
  )
}

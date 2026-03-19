import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { ReactTable } from '../../components/table/reactTable'
import { useAdminStats } from '../../queries/useAdminStats'

export const Route = createFileRoute('/_admin/admin/stats')({
  component: AdminStats,
})

const RARITY_COLORS: Record<string, string> = {
  COMMON: '#9ca3af',
  UNCOMMON: '#4ade80',
  RARE: '#60a5fa',
  EPIC: '#c084fc',
  LEGENDARY: '#fbbf24',
}

type TopCard = { id: string; name: string; rarity: string; count: number }
type TopUser = { id: string; username: string; count: number }

function AdminStats() {
  const { data, isLoading } = useAdminStats()

  const cardColumns = useMemo<ColumnDef<TopCard>[]>(
    () => [
      { accessorKey: 'name', header: 'Carte', meta: { grow: true } },
      { accessorKey: 'rarity', header: 'Rareté', size: 110 },
      { accessorKey: 'count', header: 'Tirages', size: 90 },
    ],
    [],
  )

  const userColumns = useMemo<ColumnDef<TopUser>[]>(
    () => [
      { accessorKey: 'username', header: 'Joueur', meta: { grow: true } },
      { accessorKey: 'count', header: 'Pulls', size: 90 },
    ],
    [],
  )

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center text-text-light">
        Chargement…
      </div>
    )
  }

  const topCards: TopCard[] = data.topCards.map((c) => ({ ...c, id: c.cardId }))
  const topUsers: TopUser[] = data.topUsers.map((u) => ({ ...u, id: u.userId }))

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-black text-text">Statistiques</h1>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-light">
            Distribution raretés
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data.rarityDistribution}
                dataKey="count"
                nameKey="rarity"
                cx="50%"
                cy="50%"
                outerRadius={80}
              >
                {data.rarityDistribution.map((entry) => (
                  <Cell
                    key={entry.rarity}
                    fill={RARITY_COLORS[entry.rarity] ?? '#6b7280'}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(v, n) => [v, n]}
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex h-72 flex-col rounded-xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-light">
            Top 10 cartes
          </p>
          <div className="min-h-0 flex-1 overflow-hidden">
            <ReactTable
              columns={cardColumns}
              data={topCards}
              filterId="admin-stats-cards"
              infiniteScroll={false}
            />
          </div>
        </div>
      </div>

      <div className="flex h-80 flex-col rounded-xl border border-border bg-card p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-light">
          Top 10 joueurs
        </p>
        <div className="min-h-0 flex-1 overflow-hidden">
          <ReactTable
            columns={userColumns}
            data={topUsers}
            filterId="admin-stats-users"
            infiniteScroll={false}
          />
        </div>
      </div>
    </div>
  )
}

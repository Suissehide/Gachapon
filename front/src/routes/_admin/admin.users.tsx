// front/src/routes/_admin/admin.users.tsx
import { createFileRoute } from '@tanstack/react-router'
import { apiUrl } from '../../constants/config.constant.ts'
import { useState } from 'react'

import { AdminDrawer } from '../../components/admin/AdminDrawer'
import { AdminTable } from '../../components/admin/AdminTable'
import { Button } from '../../components/ui/button'
import {
  type AdminUser,
  useAdminSuspendUser,
  useAdminUpdateDust,
  useAdminUpdateRole,
  useAdminUpdateTokens,
  useAdminUser,
  useAdminUsers,
} from '../../queries/useAdminUsers'

export const Route = createFileRoute('/_admin/admin/users')({
  component: AdminUsers,
})

function AdminUsers() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<AdminUser | null>(null)
  const [tokenAmount, setTokenAmount] = useState('')
  const [dustAmount, setDustAmount] = useState('')

  const { data, isLoading } = useAdminUsers({ page, limit: 20, search: search || undefined })
  const { data: detail } = useAdminUser(selected?.id ?? '')
  const updateTokens = useAdminUpdateTokens()
  const updateDust = useAdminUpdateDust()
  const updateRole = useAdminUpdateRole()
  const suspend = useAdminSuspendUser()

  const columns = [
    { key: 'username', header: 'Username' },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', render: (u: AdminUser) => (
      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${u.role === 'SUPER_ADMIN' ? 'bg-primary/20 text-primary' : 'bg-border text-text-light'}`}>
        {u.role}
      </span>
    )},
    { key: 'tokens', header: 'Tokens' },
    { key: 'dust', header: 'Dust' },
    { key: 'suspended', header: 'Statut', render: (u: AdminUser) => (
      <span className={`text-xs font-semibold ${u.suspended ? 'text-red-400' : 'text-green-400'}`}>
        {u.suspended ? 'Suspendu' : 'Actif'}
      </span>
    )},
  ]

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-black text-text">Joueurs</h1>

      <div className="mb-4 flex gap-3">
        <input
          type="text"
          placeholder="Rechercher par username ou email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-light focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <AdminTable columns={columns} rows={data?.users ?? []} onRowClick={setSelected} isLoading={isLoading} />

      {data && (
        <div className="mt-4 flex items-center justify-between text-sm text-text-light">
          <span>{data.total} utilisateurs</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Précédent</Button>
            <Button size="sm" variant="ghost" disabled={page * 20 >= data.total} onClick={() => setPage(p => p + 1)}>Suivant</Button>
          </div>
        </div>
      )}

      <AdminDrawer open={!!selected} onClose={() => setSelected(null)} title={selected?.username ?? ''}>
        {selected && detail && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-surface p-3">
                <p className="text-xl font-bold text-text">{detail.stats.pullsTotal}</p>
                <p className="text-xs text-text-light">Pulls</p>
              </div>
              <div className="rounded-lg bg-surface p-3">
                <p className="text-xl font-bold text-text">{detail.stats.cardsOwned}</p>
                <p className="text-xs text-text-light">Cartes</p>
              </div>
              <div className="rounded-lg bg-surface p-3">
                <p className="text-xl font-bold text-text">{detail.stats.dustGenerated}</p>
                <p className="text-xs text-text-light">Dust gagné</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-light">Attribuer tokens</p>
              <div className="flex gap-2">
                <input type="number" value={tokenAmount} onChange={(e) => setTokenAmount(e.target.value)}
                  placeholder="Quantité" className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text" />
                <Button size="sm" onClick={() => { updateTokens.mutate({ id: selected.id, amount: Number(tokenAmount) }); setTokenAmount('') }}>
                  Attribuer
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-text-light">Attribuer dust</p>
              <div className="flex gap-2">
                <input type="number" value={dustAmount} onChange={(e) => setDustAmount(e.target.value)}
                  placeholder="Quantité" className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text" />
                <Button size="sm" onClick={() => { updateDust.mutate({ id: selected.id, amount: Number(dustAmount) }); setDustAmount('') }}>
                  Attribuer
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="flex-1 border border-border"
                onClick={() => updateRole.mutate({ id: selected.id, role: selected.role === 'SUPER_ADMIN' ? 'USER' : 'SUPER_ADMIN' })}>
                {selected.role === 'SUPER_ADMIN' ? 'Révoquer admin' : 'Promouvoir admin'}
              </Button>
              <Button size="sm" variant="ghost"
                className={`flex-1 border ${selected.suspended ? 'border-green-500/30 text-green-400' : 'border-red-500/30 text-red-400'}`}
                onClick={() => suspend.mutate({ id: selected.id, suspended: !selected.suspended })}>
                {selected.suspended ? 'Réactiver' : 'Suspendre'}
              </Button>
            </div>

            <a
              href={`${apiUrl}/admin/users/${selected.id}/collection`}
              target="_blank"
              rel="noreferrer"
              className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-center text-sm text-text-light transition-colors hover:text-text"
            >
              Voir collection →
            </a>
          </div>
        )}
      </AdminDrawer>
    </div>
  )
}

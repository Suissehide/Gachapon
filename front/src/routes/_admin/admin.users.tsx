import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { Eye } from 'lucide-react'
import { useMemo, useState } from 'react'

import { AdminDrawer } from '../../components/admin/AdminDrawer'
import { ReactTable } from '../../components/table/reactTable'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { apiUrl } from '../../constants/config.constant.ts'
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

  const { data, isLoading } = useAdminUsers({
    page,
    limit: 20,
    search: search || undefined,
  })
  const { data: detail } = useAdminUser(selected?.id ?? '')
  const updateTokens = useAdminUpdateTokens()
  const updateDust = useAdminUpdateDust()
  const updateRole = useAdminUpdateRole()
  const suspend = useAdminSuspendUser()

  const columns = useMemo<ColumnDef<AdminUser>[]>(
    () => [
      {
        accessorKey: 'username',
        header: 'Username',
        meta: { grow: true },
      },
      {
        accessorKey: 'email',
        header: 'Email',
        meta: { grow: true },
      },
      {
        accessorKey: 'role',
        header: 'Rôle',
        size: 120,
        cell: ({ row }) => (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${row.original.role === 'SUPER_ADMIN' ? 'bg-primary/20 text-primary' : 'bg-border text-text-light'}`}
          >
            {row.original.role}
          </span>
        ),
      },
      {
        accessorKey: 'tokens',
        header: 'Tokens',
        size: 80,
      },
      {
        accessorKey: 'dust',
        header: 'Dust',
        size: 80,
      },
      {
        accessorKey: 'suspended',
        header: 'Statut',
        size: 90,
        cell: ({ row }) => (
          <span
            className={`text-xs font-semibold ${row.original.suspended ? 'text-red-400' : 'text-green-400'}`}
          >
            {row.original.suspended ? 'Suspendu' : 'Actif'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        size: 48,
        cell: ({ row }) => (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              setSelected(row.original)
            }}
            className="rounded p-1 text-text-light transition-colors hover:bg-muted hover:text-text"
          >
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [],
  )

  return (
    <div className="flex h-screen flex-col p-8">
      <h1 className="mb-6 text-2xl font-black text-text">Joueurs</h1>

      <div className="mb-4">
        <Input
          type="text"
          placeholder="Rechercher par username ou email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-text-light">
            Chargement…
          </div>
        ) : (
          <ReactTable
            columns={columns}
            data={data?.users ?? []}
            filterId="admin-users"
          />
        )}
      </div>

      <AdminDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.username ?? ''}
      >
        {selected && detail && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-surface p-3">
                <p className="text-xl font-bold text-text">
                  {detail.stats.pullsTotal}
                </p>
                <p className="text-xs text-text-light">Pulls</p>
              </div>
              <div className="rounded-lg bg-surface p-3">
                <p className="text-xl font-bold text-text">
                  {detail.stats.cardsOwned}
                </p>
                <p className="text-xs text-text-light">Cartes</p>
              </div>
              <div className="rounded-lg bg-surface p-3">
                <p className="text-xl font-bold text-text">
                  {detail.stats.dustGenerated}
                </p>
                <p className="text-xs text-text-light">Dust gagné</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-text-light">
                Attribuer tokens
              </p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                  placeholder="Quantité"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    updateTokens.mutate({
                      id: selected.id,
                      amount: Number(tokenAmount),
                    })
                    setTokenAmount('')
                  }}
                >
                  Attribuer
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-text-light">
                Attribuer dust
              </p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={dustAmount}
                  onChange={(e) => setDustAmount(e.target.value)}
                  placeholder="Quantité"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    updateDust.mutate({
                      id: selected.id,
                      amount: Number(dustAmount),
                    })
                    setDustAmount('')
                  }}
                >
                  Attribuer
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="flex-1 border border-border"
                onClick={() =>
                  updateRole.mutate({
                    id: selected.id,
                    role:
                      selected.role === 'SUPER_ADMIN' ? 'USER' : 'SUPER_ADMIN',
                  })
                }
              >
                {selected.role === 'SUPER_ADMIN'
                  ? 'Révoquer admin'
                  : 'Promouvoir admin'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className={`flex-1 border ${selected.suspended ? 'border-green-500/30 text-green-400' : 'border-red-500/30 text-red-400'}`}
                onClick={() =>
                  suspend.mutate({
                    id: selected.id,
                    suspended: !selected.suspended,
                  })
                }
              >
                {selected.suspended ? 'Réactiver' : 'Suspendre'}
              </Button>
            </div>

            <a
              href={`${apiUrl}/admin/users/${selected.id}/collection`}
              target="_blank"
              rel="noreferrer"
              className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-center text-sm text-text-light transition-colors hover:text-text"
            >
              on →
            </a>
          </div>
        )}
      </AdminDrawer>
    </div>
  )
}

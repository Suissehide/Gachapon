import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import dayjs from 'dayjs'
import type { TFunction } from 'i18next'
import { Download, Gift, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { AdminUsersFilters } from '../../api/admin-users.api.ts'
import { AdminUsersApi } from '../../api/admin-users.api.ts'
import { AdminDrawer } from '../../components/admin/AdminDrawer'
import { AdminPageHeader } from '../../components/admin/shared/AdminPageHeader.tsx'
import {
  DataTable,
  selectionColumn,
} from '../../components/admin/shared/DataTable.tsx'
import { BulkRewardPopup } from '../../components/admin/users/BulkRewardPopup.tsx'
import { Badge } from '../../components/ui/badge.tsx'
import { Button } from '../../components/ui/button'
import { DatePicker } from '../../components/ui/datePicker.tsx'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label.tsx'
import { SegmentedControl } from '../../components/ui/segmentedControl.tsx'
import { apiUrl } from '../../constants/config.constant.ts'
import i18n from '../../i18n/index.ts'
import type { AdminUser } from '../../queries/useAdminUsers'
import {
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

type StatusFilter = 'all' | 'active' | 'suspended'

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: i18n.t('admin:users.statusOptions.all') },
  { value: 'active', label: i18n.t('admin:users.statusOptions.active') },
  {
    value: 'suspended',
    label: i18n.t('admin:users.statusOptions.suspended'),
  },
]

const STATUS_API_MAP: Record<
  StatusFilter,
  AdminUsersFilters['status'] | undefined
> = {
  all: undefined,
  active: 'active',
  suspended: 'suspended',
}

function buildColumns(t: TFunction<'admin'>): ColumnDef<AdminUser>[] {
  return [
    selectionColumn<AdminUser>(),
    {
      accessorKey: 'username',
      header: t('users.columns.username'),
      meta: { grow: true },
    },
    {
      accessorKey: 'email',
      header: t('users.columns.email'),
      meta: { grow: true },
    },
    {
      accessorKey: 'role',
      header: t('users.columns.role'),
      size: 120,
      cell: ({ row }) => (
        <Badge
          variant={row.original.role === 'SUPER_ADMIN' ? 'primary' : 'neutral'}
          size="sm"
        >
          {row.original.role}
        </Badge>
      ),
    },
    { accessorKey: 'tokens', header: t('users.columns.tokens'), size: 80 },
    { accessorKey: 'dust', header: t('users.columns.dust'), size: 80 },
    { accessorKey: 'level', header: t('users.columns.level'), size: 70 },
    {
      accessorKey: 'suspended',
      header: t('users.columns.status'),
      size: 100,
      cell: ({ row }) => (
        <Badge
          variant={row.original.suspended ? 'danger' : 'success'}
          size="sm"
        >
          {row.original.suspended
            ? t('users.columns.statusSuspended')
            : t('users.columns.statusActive')}
        </Badge>
      ),
    },
    {
      accessorKey: 'lastLoginAt',
      header: t('users.columns.lastLogin'),
      size: 150,
      cell: ({ row }) => {
        const val = row.original.lastLoginAt
        return (
          <span className="text-text-light">
            {val ? dayjs(val).format('DD/MM/YYYY') : '—'}
          </span>
        )
      },
    },
  ]
}

function rewardLabel(t: TFunction<'admin'>, ids: string[]): string {
  return t('users.selectedCount', { count: ids.length })
}

function AdminUsers() {
  const { t } = useTranslation('admin')
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<AdminUsersFilters>({})
  const [statusTab, setStatusTab] = useState<StatusFilter>('all')
  const [selected, setSelected] = useState<AdminUser | null>(null)
  const [tokenAmount, setTokenAmount] = useState('')
  const [dustAmount, setDustAmount] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [tableKey, setTableKey] = useState(0)
  const [rewardPopupOpen, setRewardPopupOpen] = useState(false)
  const [rewardTarget, setRewardTarget] = useState<'ALL' | string[]>('ALL')
  const [rewardTargetLabel, setRewardTargetLabel] = useState('')

  const apiFilters: AdminUsersFilters = {
    ...filters,
    status: STATUS_API_MAP[statusTab],
  }

  const { data, isLoading } = useAdminUsers({ page, limit: 20, ...apiFilters })
  const { data: detail } = useAdminUser(selected?.id ?? '')
  const updateTokens = useAdminUpdateTokens()
  const updateDust = useAdminUpdateDust()
  const updateRole = useAdminUpdateRole()
  const suspend = useAdminSuspendUser()

  const columns = useMemo(() => buildColumns(t), [t])

  function updateFilter<K extends keyof AdminUsersFilters>(
    key: K,
    value: AdminUsersFilters[K],
  ) {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const handleExport = async () => {
    const blob = await AdminUsersApi.exportCsv(apiFilters)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = t('users.exportFilename')
    a.click()
    URL.revokeObjectURL(url)
  }

  const openRewardAll = () => {
    setRewardTarget('ALL')
    setRewardTargetLabel(t('users.allActivePlayersLabel'))
    setRewardPopupOpen(true)
  }

  const openRewardSelected = () => {
    setRewardTarget(selectedIds)
    setRewardTargetLabel(rewardLabel(t, selectedIds))
    setRewardPopupOpen(true)
  }

  return (
    <div className="flex h-screen flex-col p-8">
      <AdminPageHeader
        icon={Users}
        kicker={t('common.kicker.players')}
        title={t('users.pageTitle')}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-1.5 h-4 w-4" />
              {t('users.exportButton')}
            </Button>
            <Button size="sm" onClick={openRewardAll}>
              <Gift className="mr-1.5 h-4 w-4" />
              {t('users.sendRewardButton')}
            </Button>
          </>
        }
      />

      {/* Barre de filtres */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Input
            type="text"
            placeholder={t('users.searchPlaceholder')}
            value={filters.search ?? ''}
            onChange={(e) =>
              updateFilter('search', e.target.value || undefined)
            }
          />
        </div>

        <SegmentedControl
          options={STATUS_OPTIONS}
          value={statusTab}
          onChange={(v) => {
            setStatusTab(v)
            setPage(1)
          }}
        />

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-text-light">
            {t('users.filters.registeredFromLabel')}
          </Label>
          <DatePicker
            value={filters.createdFrom ? dayjs(filters.createdFrom) : null}
            onChange={(d) =>
              updateFilter('createdFrom', d ? d.toISOString() : undefined)
            }
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-text-light">
            {t('users.filters.toLabel')}
          </Label>
          <DatePicker
            value={filters.createdTo ? dayjs(filters.createdTo) : null}
            onChange={(d) =>
              updateFilter('createdTo', d ? d.toISOString() : undefined)
            }
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-text-light">
            {t('users.filters.lastLoginFromLabel')}
          </Label>
          <DatePicker
            value={filters.lastLoginFrom ? dayjs(filters.lastLoginFrom) : null}
            onChange={(d) =>
              updateFilter('lastLoginFrom', d ? d.toISOString() : undefined)
            }
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-text-light">
            {t('users.filters.toLabel')}
          </Label>
          <DatePicker
            value={filters.lastLoginTo ? dayjs(filters.lastLoginTo) : null}
            onChange={(d) =>
              updateFilter('lastLoginTo', d ? d.toISOString() : undefined)
            }
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-text-light">
            {t('users.filters.levelMinLabel')}
          </Label>
          <Input
            type="number"
            className="w-20"
            placeholder={t('users.filters.levelMinPlaceholder')}
            value={filters.levelMin ?? ''}
            onChange={(e) =>
              updateFilter(
                'levelMin',
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-text-light">
            {t('users.filters.levelMaxLabel')}
          </Label>
          <Input
            type="number"
            className="w-20"
            placeholder={t('users.filters.levelMaxPlaceholder')}
            value={filters.levelMax ?? ''}
            onChange={(e) =>
              updateFilter(
                'levelMax',
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
          />
        </div>
      </div>

      {/* Barre contextuelle de sélection */}
      {selectedIds.length > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-2">
          <span className="text-sm font-medium text-text">
            {rewardLabel(t, selectedIds)}
          </span>
          <Button size="sm" onClick={openRewardSelected}>
            <Gift className="mr-1.5 h-4 w-4" />
            {t('users.sendRewardButton')}
          </Button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
        <DataTable
          key={tableKey}
          columns={columns}
          data={data?.users ?? []}
          isLoading={isLoading}
          emptyIcon={Users}
          emptyTitle={t('users.emptyTitle')}
          emptyDescription={t('users.emptyDescription')}
          filterId="admin-users"
          onSelectionChange={setSelectedIds}
        />
      </div>

      <AdminDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.username ?? ''}
      >
        {selected && detail && (
          <AdminUserDetail
            selected={selected}
            detail={detail}
            tokenAmount={tokenAmount}
            dustAmount={dustAmount}
            onTokenAmountChange={setTokenAmount}
            onDustAmountChange={setDustAmount}
            onUpdateTokens={(amount) =>
              updateTokens.mutate({ id: selected.id, amount })
            }
            onUpdateDust={(amount) =>
              updateDust.mutate({ id: selected.id, amount })
            }
            onUpdateRole={() =>
              updateRole.mutate({
                id: selected.id,
                role: selected.role === 'SUPER_ADMIN' ? 'USER' : 'SUPER_ADMIN',
              })
            }
            onSuspend={() =>
              suspend.mutate({
                id: selected.id,
                suspended: !selected.suspended,
              })
            }
          />
        )}
      </AdminDrawer>

      <BulkRewardPopup
        open={rewardPopupOpen}
        onClose={() => setRewardPopupOpen(false)}
        onSuccess={() => {
          setSelectedIds([])
          setTableKey((k) => k + 1)
        }}
        target={rewardTarget}
        targetLabel={rewardTargetLabel}
      />
    </div>
  )
}

type DetailProps = {
  selected: AdminUser
  detail: {
    stats: { pullsTotal: number; cardsOwned: number; dustGenerated: number }
  }
  tokenAmount: string
  dustAmount: string
  onTokenAmountChange: (v: string) => void
  onDustAmountChange: (v: string) => void
  onUpdateTokens: (amount: number) => void
  onUpdateDust: (amount: number) => void
  onUpdateRole: () => void
  onSuspend: () => void
}

function AdminUserDetail({
  selected,
  detail,
  tokenAmount,
  dustAmount,
  onTokenAmountChange,
  onDustAmountChange,
  onUpdateTokens,
  onUpdateDust,
  onUpdateRole,
  onSuspend,
}: DetailProps) {
  const { t } = useTranslation('admin')
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-surface p-3">
          <p className="text-xl font-bold text-text">
            {detail.stats.pullsTotal}
          </p>
          <p className="text-xs text-text-light">
            {t('users.detail.statPulls')}
          </p>
        </div>
        <div className="rounded-lg bg-surface p-3">
          <p className="text-xl font-bold text-text">
            {detail.stats.cardsOwned}
          </p>
          <p className="text-xs text-text-light">
            {t('users.detail.statCards')}
          </p>
        </div>
        <div className="rounded-lg bg-surface p-3">
          <p className="text-xl font-bold text-text">
            {detail.stats.dustGenerated}
          </p>
          <p className="text-xs text-text-light">
            {t('users.detail.statDustGained')}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-light">
          {t('users.detail.grantTokensTitle')}
        </p>
        <div className="flex gap-2">
          <Input
            type="number"
            value={tokenAmount}
            onChange={(e) => onTokenAmountChange(e.target.value)}
            placeholder={t('users.detail.amountPlaceholder')}
          />
          <Button
            size="sm"
            onClick={() => {
              onUpdateTokens(Number(tokenAmount))
              onTokenAmountChange('')
            }}
          >
            {t('users.detail.grantButton')}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-light">
          {t('users.detail.grantDustTitle')}
        </p>
        <div className="flex gap-2">
          <Input
            type="number"
            value={dustAmount}
            onChange={(e) => onDustAmountChange(e.target.value)}
            placeholder={t('users.detail.amountPlaceholder')}
          />
          <Button
            size="sm"
            onClick={() => {
              onUpdateDust(Number(dustAmount))
              onDustAmountChange('')
            }}
          >
            {t('users.detail.grantButton')}
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="flex-1 border border-border"
          onClick={onUpdateRole}
        >
          {selected.role === 'SUPER_ADMIN'
            ? t('users.detail.revokeAdmin')
            : t('users.detail.promoteAdmin')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className={`flex-1 border ${selected.suspended ? 'border-success/30 text-success' : 'border-destructive/30 text-destructive'}`}
          onClick={onSuspend}
        >
          {selected.suspended
            ? t('users.detail.reactivate')
            : t('users.detail.suspend')}
        </Button>
      </div>

      <a
        href={`${apiUrl}/admin/users/${selected.id}/collection`}
        target="_blank"
        rel="noreferrer"
        className="block w-full rounded-lg border border-border bg-surface px-3 py-2 text-center text-sm text-text-light transition-colors hover:text-text"
      >
        {t('users.detail.collectionLink')}
      </a>
    </div>
  )
}

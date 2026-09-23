import type { ColumnDef } from '@tanstack/react-table'
import { Pencil } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { currentLocale } from '../../../i18n/index.ts'
import { formatNumber } from '../../../libs/utils.ts'
import type { AdminShopItem } from '../../../queries/useAdminShop'
import { Button } from '../../ui/button'

export function useShopColumns(onEdit: (item: AdminShopItem) => void) {
  const { t } = useTranslation('admin')
  return useMemo<ColumnDef<AdminShopItem>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('shop.columns.name'),
        meta: { grow: true },
      },
      { accessorKey: 'type', header: t('shop.columns.type'), size: 120 },
      {
        accessorKey: 'cost',
        header: t('shop.columns.cost'),
        size: 130,
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatNumber(row.original.cost, currentLocale())}{' '}
            <span className="text-text-light">
              {row.original.currency === 'GOLD'
                ? t('common:currency.gold.singular')
                : t('common:currency.dust.singular')}
            </span>
          </span>
        ),
      },
      {
        accessorKey: 'isActive',
        header: t('shop.columns.active'),
        size: 80,
        cell: ({ row }) => (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              row.original.isActive
                ? 'bg-success/20 text-success'
                : 'bg-border text-text-light'
            }`}
          >
            {row.original.isActive
              ? t('shop.columns.statusActive')
              : t('shop.columns.statusInactive')}
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
              onEdit(row.original)
            }}
            title={t('common.editTooltip')}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ),
      },
    ],
    [onEdit, t],
  )
}

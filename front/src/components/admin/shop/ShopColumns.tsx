import type { ColumnDef } from '@tanstack/react-table'
import { Pencil } from 'lucide-react'
import { useMemo } from 'react'

import type { AdminShopItem } from '../../../queries/useAdminShop'
import { Button } from '../../ui/button'

export function useShopColumns(onEdit: (item: AdminShopItem) => void) {
  return useMemo<ColumnDef<AdminShopItem>[]>(
    () => [
      { accessorKey: 'name', header: 'Nom', meta: { grow: true } },
      { accessorKey: 'type', header: 'Type', size: 120 },
      { accessorKey: 'dustCost', header: 'Coût (dust)', size: 110 },
      {
        accessorKey: 'isActive',
        header: 'Actif',
        size: 80,
        cell: ({ row }) => (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              row.original.isActive
                ? 'bg-green-500/20 text-green-400'
                : 'bg-border text-text-light'
            }`}
          >
            {row.original.isActive ? 'Actif' : 'Inactif'}
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
            title="Modifier"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ),
      },
    ],
    [onEdit],
  )
}

import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2 } from 'lucide-react'
import { useMemo } from 'react'

import notFoundImg from '../../../assets/data/not-found.png'
import { RARITY_BADGE_VARIANT } from '../../../libs/rarity.ts'
import type { AdminCard } from '../../../queries/useAdminCards'
import { Badge } from '../../ui/badge.tsx'
import { Button } from '../../ui/button'

export function useCardColumnsAll(
  onEdit: (card: AdminCard) => void,
  onDelete: (id: string) => void,
) {
  return useMemo<ColumnDef<AdminCard>[]>(
    () => [
      {
        id: 'image',
        header: '',
        size: 60,
        cell: ({ row }) => (
          <img
            src={row.original.imageUrl || notFoundImg}
            alt={row.original.name}
            className="h-[38px] w-[28px] rounded object-cover"
          />
        ),
      },
      {
        accessorKey: 'name',
        header: 'Nom',
        meta: { grow: true },
      },
      {
        id: 'set',
        header: 'Set',
        size: 140,
        accessorFn: (row) => row.set.name,
      },
      {
        accessorKey: 'rarity',
        header: 'Rareté',
        size: 110,
        cell: ({ row }) => (
          <Badge
            variant={RARITY_BADGE_VARIANT[row.original.rarity] ?? 'neutral'}
            size="sm"
          >
            {row.original.rarity}
          </Badge>
        ),
      },
      {
        accessorKey: 'dropWeight',
        header: 'Poids',
        size: 80,
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-primary">
            {row.original.dropWeight}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        size: 72,
        cell: ({ row }) => (
          <div className="flex gap-1">
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
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(row.original.id)
              }}
              title="Supprimer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [onEdit, onDelete],
  )
}

import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2 } from 'lucide-react'
import { useMemo } from 'react'

import notFoundImg from '../../../assets/data/not-found.png'
import { RARITY_COLORS } from '../../../constants/card.constant'
import type { AdminCard } from '../../../queries/useAdminCards'
import { Button } from '../../ui/button'

export function useCardColumns(
  data: AdminCard[],
  onEdit: (card: AdminCard) => void,
  onDelete: (id: string) => void,
) {
  const totalWeight = useMemo(
    () => data.reduce((sum, c) => sum + c.dropWeight, 0),
    [data],
  )

  return useMemo<ColumnDef<AdminCard>[]>(
    () => [
      {
        id: 'image',
        header: '',
        size: 44,
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
        accessorKey: 'rarity',
        header: 'Rareté',
        size: 110,
        cell: ({ row }) => (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${RARITY_COLORS[row.original.rarity] ?? 'bg-border text-text-light'}`}
          >
            {row.original.rarity}
          </span>
        ),
      },
      {
        accessorKey: 'dropWeight',
        header: 'Poids',
        size: 130,
        cell: ({ row }) => {
          const pct =
            totalWeight > 0 ? (row.original.dropWeight / totalWeight) * 100 : 0
          return (
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-semibold text-primary">
                  {row.original.dropWeight}
                </span>
                <span className="text-text-light">{pct.toFixed(1)}%</span>
              </div>
              <div className="h-1 rounded-full bg-border">
                <div
                  className="h-1 rounded-full bg-primary/60"
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          )
        },
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
              className="text-red-400 hover:text-red-400"
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
    [totalWeight, onEdit, onDelete],
  )
}

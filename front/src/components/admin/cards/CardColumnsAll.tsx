import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import notFoundImg from '../../../assets/data/not-found.png'
import { RARITY_BADGE_VARIANT } from '../../../libs/rarity.ts'
import type { AdminCard } from '../../../queries/useAdminCards'
import { ElementTag } from '../../shared/ElementTag.tsx'
import { Badge } from '../../ui/badge.tsx'
import { Button } from '../../ui/button'

export function useCardColumnsAll(
  onEdit: (card: AdminCard) => void,
  onDelete: (id: string) => void,
) {
  const { t } = useTranslation('admin')
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
        header: t('cards.columns.name'),
        meta: { grow: true },
      },
      {
        id: 'set',
        header: t('cards.columns.set'),
        size: 140,
        accessorFn: (row) => row.set.name,
      },
      {
        accessorKey: 'rarity',
        header: t('cards.columns.rarity'),
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
        accessorKey: 'element',
        header: t('cards.columns.element'),
        size: 110,
        cell: ({ row }) => <ElementTag element={row.original.element} />,
      },
      {
        accessorKey: 'dropWeight',
        header: t('cards.columns.weight'),
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
              title={t('common.editTooltip')}
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
              title={t('common.deleteTooltip')}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [onEdit, onDelete, t],
  )
}

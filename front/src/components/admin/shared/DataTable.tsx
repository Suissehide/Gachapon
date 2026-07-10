import type { ColumnDef, Row } from '@tanstack/react-table'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { ReactTable } from '../../table/reactTable'
import { Checkbox } from '../../ui/input.tsx'
import { EmptyState } from './EmptyState'

export function selectionColumn<TData>(): ColumnDef<TData, unknown> {
  return {
    id: 'select',
    size: 36,
    enableSorting: false,
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllRowsSelected()}
        onChange={table.getToggleAllRowsSelectedHandler()}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        onClick={(e) => e.stopPropagation()}
      />
    ),
  }
}

type DataTableProps<TData extends { id: string }> = {
  columns: ColumnDef<TData, any>[]
  data: TData[]
  isLoading?: boolean
  emptyIcon: LucideIcon
  emptyTitle: string
  emptyDescription?: string
  filterId?: string
  title?: string
  customHeader?: (rows: Row<TData>[]) => ReactNode
  onRowClick?: (row: Row<TData>) => void
  onSelectionChange?: (ids: string[]) => void
}

export function DataTable<TData extends { id: string }>({
  isLoading,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  data,
  ...tableProps
}: DataTableProps<TData>) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-5">
        {Array.from({ length: 8 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows are static, never reordered
          <div key={i} className="h-9 animate-pulse rounded-lg bg-border" />
        ))}
      </div>
    )
  }
  if (data.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
      />
    )
  }
  return <ReactTable data={data} {...tableProps} />
}

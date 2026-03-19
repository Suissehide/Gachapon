import {
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type Row,
  type RowSelectionState,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table'
import {
  type CSSProperties,
  type FC,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'

import { safeParse } from '../../libs/utils.ts'
import {
  dateFilterFn,
  dateRangeFilterFn,
  multiSelectFilterFn,
  numberFilterFn,
  numberRangeFilterFn,
  selectFilterFn,
  textFilterFn,
} from './filtersFns'
import { HeaderTable } from './headerTable.js'
import { VirtualizedBodyTable } from './virtualizedBodyTable'

export type CustomMeta<TData, TValue> = {
  pin?: 'left' | 'right'
  headerClass?: string
  grow?: boolean
  filter?: FC<{ column: Column<TData, TValue> }>
}

type CustomColumnDef<TData, TValue = unknown> = ColumnDef<TData, TValue> & {
  meta?: CustomMeta<TData, TValue>
}

type ReactTableProps<TData extends { id: string }> = {
  columns: CustomColumnDef<TData, any>[]
  data: TData[]
  customButtons?: ReactNode[]
  title?: string
  customHeader?: (rows: Row<TData>[]) => ReactNode
  filterId?: string
  infiniteScroll?: boolean
}

export function ReactTable<TData extends { id: string }>({
  columns,
  data,
  title,
  customHeader,
  filterId = 'default',
  infiniteScroll = true,
}: ReactTableProps<TData>) {
  const initialColumnFilters = safeParse(
    localStorage.getItem(`filters/${filterId}`),
    [],
  )
  const initialColumnVisibility = safeParse(
    localStorage.getItem(`column-visibility/${filterId}`),
    {},
  )

  const [columnFilters, setColumnFilters] =
    useState<ColumnFiltersState>(initialColumnFilters)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    initialColumnVisibility,
  )
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  })

  const table = useReactTable({
    data: data,
    columns: columns,
    state: {
      columnVisibility,
      rowSelection,
      columnFilters,
      ...(infiniteScroll ? {} : { pagination }),
    },
    filterFns: {
      text: textFilterFn,
      number: numberFilterFn,
      range: numberRangeFilterFn,
      date: dateFilterFn,
      dateRange: dateRangeFilterFn,
      select: selectFilterFn,
      multiSelect: multiSelectFilterFn,
    },
    defaultColumn: {
      size: 150,
      minSize: 0,
    },
    globalFilterFn: textFilterFn,
    manualPagination: false,
    onPaginationChange: infiniteScroll ? undefined : setPagination,
    getPaginationRowModel: infiniteScroll ? undefined : getPaginationRowModel(),
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    enableRowSelection: true,
    enableColumnPinning: true,
    autoResetPageIndex: false,
    debugTable: false,
    debugHeaders: false,
    debugColumns: false,
  })

  useEffect(() => {
    localStorage.setItem(`filters/${filterId}`, JSON.stringify(columnFilters))
  }, [columnFilters, filterId])

  useEffect(() => {
    localStorage.setItem(
      `column-visibility/${filterId}`,
      JSON.stringify(columnVisibility),
    )
  }, [columnVisibility, filterId])

  const getCommonPinningStyles = <TData,>(
    column: Column<TData, unknown>,
  ): CSSProperties => {
    const isPinned = column.getIsPinned()

    return {
      left: isPinned === 'left' ? `${column.getStart('left')}px` : undefined,
      right: isPinned === 'right' ? `${column.getAfter('right')}px` : undefined,
      position: isPinned ? 'sticky' : 'relative',
      zIndex: isPinned ? 1 : 0,
      backgroundColor: isPinned ? 'var(--color-card)' : 'transparent',
    }
  }

  useEffect(() => {
    for (const column of table.getAllLeafColumns()) {
      const meta = column.columnDef.meta as CustomMeta<TData, unknown>
      const pin = meta?.pin
      if (pin) {
        column.pin(pin)
      }
    }
  }, [table])

  const totalRows = table.getFilteredRowModel().rows.length
  const tableContainerRef = useRef(null)

  return (
    <div className="flex h-full flex-col">
      {title && (
        <div className="px-5 py-4 text-base font-bold text-text">{title}</div>
      )}

      {customHeader?.(table.getRowModel().rows)}

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="h-full w-full overflow-auto" ref={tableContainerRef}>
          <table className="w-full border-collapse">
            <HeaderTable
              table={table}
              getCommonPinningStyles={getCommonPinningStyles}
            />
            <VirtualizedBodyTable
              table={table}
              getCommonPinningStyles={getCommonPinningStyles}
              parentRef={tableContainerRef}
              rowHeight={40}
            />
          </table>
        </div>
      </div>

      <div className="flex items-center justify-end border-t border-border/40 px-4 py-2">
        <span className="text-xs text-text-light">
          <span className="font-semibold text-primary">
            {totalRows.toLocaleString('fr-FR')}
          </span>{' '}
          {totalRows > 1 ? 'résultats' : 'résultat'}
        </span>
      </div>
    </div>
  )
}

export default ReactTable

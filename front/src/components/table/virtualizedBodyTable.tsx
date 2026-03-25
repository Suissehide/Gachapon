import {
  type Column,
  flexRender,
  type Row,
  type Table,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import type React from 'react'
import { type RefObject, useEffect } from 'react'

import type { CustomMeta } from './reactTable.tsx'

type VirtualizedBodyTableProps<TData> = {
  table: Table<TData>
  getCommonPinningStyles: (column: Column<TData>) => React.CSSProperties
  rowHeight: number
  parentRef: RefObject<HTMLElement | null>
  onRowClick?: (row: Row<TData>) => void
}

export function VirtualizedBodyTable<TData>({
  table,
  getCommonPinningStyles,
  rowHeight,
  parentRef,
  onRowClick,
}: VirtualizedBodyTableProps<TData>) {
  const rows = table.getRowModel().rows
  const rowCount = rows.length

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 3,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0
  const paddingBottom =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
      : 0

  useEffect(() => {
    rowVirtualizer.scrollToIndex(0)
    rowVirtualizer.measure()
  }, [rowVirtualizer])

  if (rowCount === 0) {
    return (
      <tbody className="bg-background">
        <tr>
          <td
            colSpan={table.getAllLeafColumns().length}
            className="py-16 text-center"
          >
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-sm font-medium text-text-light">
                Aucune donnée
              </p>
              <p className="text-xs text-text-light/50">
                Aucun résultat à afficher
              </p>
            </div>
          </td>
        </tr>
      </tbody>
    )
  }

  return (
    <tbody className="bg-background">
      {paddingTop > 0 && (
        <tr style={{ height: paddingTop }}>
          <td colSpan={table.getAllLeafColumns().length} />
        </tr>
      )}

      {virtualRows.map((virtualRow) => {
        const row: Row<TData> = rows[virtualRow.index]

        return (
          <tr
            data-index={virtualRow.index}
            ref={(node) => {
              if (node) {
                rowVirtualizer.measureElement(node)
              }
            }}
            key={row.id}
            style={{ height: rowHeight }}
            className={`group border-b border-border/30 transition-[background-color,box-shadow] duration-150 ${
              onRowClick
                ? 'cursor-pointer hover:bg-amber-50/60 dark:hover:bg-primary/6'
                : 'hover:bg-muted/40'
            }`}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            {row.getVisibleCells().map((cell) => {
              const { column } = cell
              const meta = column.columnDef.meta as CustomMeta<TData, unknown>
              const grow = meta?.grow

              return (
                <td
                  key={cell.id}
                  className="px-4 py-2 text-sm text-text"
                  style={{
                    ...getCommonPinningStyles(column),
                    width: grow ? 'auto' : column.getSize(),
                    minWidth: column.getSize(),
                    height: rowHeight,
                  }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              )
            })}
          </tr>
        )
      })}

      {paddingBottom > 0 && (
        <tr style={{ height: paddingBottom }}>
          <td colSpan={table.getAllLeafColumns().length} />
        </tr>
      )}
    </tbody>
  )
}

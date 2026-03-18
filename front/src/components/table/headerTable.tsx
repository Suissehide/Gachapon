import { type Column, flexRender, type Table } from '@tanstack/react-table'
import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react'
import type React from 'react'

import type { CustomMeta } from './reactTable.tsx'

type HeaderTableProps<TData> = {
  table: Table<TData>
  getCommonPinningStyles: (column: Column<TData>) => React.CSSProperties
}

export function HeaderTable<TData>({
  table,
  getCommonPinningStyles,
}: HeaderTableProps<TData>) {
  return (
    <thead className="sticky top-0 z-10">
      {table.getHeaderGroups().map((headerGroup) => (
        <tr key={headerGroup.id}>
          {headerGroup.headers.map((header) => {
            const { column } = header
            const meta = header.column.columnDef.meta as CustomMeta<TData, unknown>
            const headerClass = meta?.headerClass ?? ''
            const grow = meta?.grow
            const filter = meta?.filter
            const sortState = column.getIsSorted()

            const SortIcon =
              sortState === 'asc' ? (
                <ChevronUp className="h-3 w-3 text-primary" />
              ) : sortState === 'desc' ? (
                <ChevronDown className="h-3 w-3 text-primary" />
              ) : (
                <ChevronsUpDown className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-50" />
              )

            return (
              <th
                key={header.id}
                colSpan={header.colSpan}
                style={{
                  ...getCommonPinningStyles(column),
                  width: grow ? 'auto' : header.getSize(),
                  minWidth: header.getSize(),
                }}
                className="border-b border-border/60 bg-card/95 backdrop-blur-sm"
              >
                {header.isPlaceholder ? null : (
                  <>
                    <button
                      type="button"
                      onClick={column.getToggleSortingHandler()}
                      className={`group flex w-full items-center gap-2 px-4 py-3 ${
                        column.getCanSort() ? 'cursor-pointer' : 'cursor-default'
                      }`}
                    >
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                          sortState ? 'text-primary' : `text-text-light ${headerClass}`
                        }`}
                      >
                        {flexRender(column.columnDef.header, header.getContext())}
                      </span>
                      {column.getCanSort() && (
                        <span className="ml-auto flex-shrink-0">{SortIcon}</span>
                      )}
                    </button>

                    {column.getCanFilter() && filter ? (
                      <div className="px-2 pb-2">
                        {flexRender(filter, { column })}
                      </div>
                    ) : null}
                  </>
                )}
              </th>
            )
          })}
        </tr>
      ))}
    </thead>
  )
}

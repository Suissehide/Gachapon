import type { ReactNode } from 'react'

type Column<T> = {
  key: keyof T | string
  header: string
  render?: (row: T) => ReactNode
}

type AdminTableProps<T extends { id: string }> = {
  columns: Column<T>[]
  rows: T[]
  onRowClick?: (row: T) => void
  isLoading?: boolean
}

export function AdminTable<T extends { id: string }>({ columns, rows, onRowClick, isLoading }: AdminTableProps<T>) {
  if (isLoading) {
    return <div className="flex h-32 items-center justify-center text-text-light">Chargement…</div>
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-surface">
          <tr>
            {columns.map((col) => (
              <th key={String(col.key)} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-text-light">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-border last:border-0 transition-colors ${onRowClick ? 'cursor-pointer hover:bg-surface/50' : ''}`}
            >
              {columns.map((col) => (
                <td key={String(col.key)} className="px-4 py-3 text-text">
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[String(col.key)] ?? '')}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-text-light">Aucun résultat</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

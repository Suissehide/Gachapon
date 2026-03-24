import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronDown, X } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '../../libs/utils.ts'
import { Button } from './button'

export type DropdownFilterItem = {
  id: string
  label: string
  checked: boolean
  icon?: ReactNode
  colorClass?: string
}

const DropdownFilter = ({
  filters,
  onFilterChange,
  onClear,
  label = 'Filtres',
}: {
  filters: DropdownFilterItem[]
  onFilterChange: (id: string, checked: boolean) => void
  onClear?: () => void
  label?: string
}) => {
  const activeCount = filters.filter((f) => f.checked).length
  const activeFilter = activeCount === 1 ? filters.find((f) => f.checked) : null

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'gap-1.5 font-normal',
            activeCount > 0 && (activeFilter?.colorClass ?? 'border-primary/40 text-primary'),
          )}
        >
          {activeFilter?.icon && (
            <span className="shrink-0">{activeFilter.icon}</span>
          )}
          {activeCount === 1
            ? activeFilter?.label
            : activeCount > 1
              ? `${label} (${activeCount})`
              : label}
          {activeCount > 0 && onClear ? (
            <X
              className="h-3.5 w-3.5 opacity-60 hover:opacity-100"
              onPointerDown={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onClear()
              }}
            />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-text-light" />
          )}
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-[9999] min-w-[180px] rounded-md border border-border bg-popover p-1 shadow-lg shadow-black/20"
          align="start"
          sideOffset={5}
        >
          {filters.map((filter) => (
            <DropdownMenu.CheckboxItem
              key={filter.id}
              checked={filter.checked}
              onCheckedChange={(checked) => onFilterChange(filter.id, checked)}
              onSelect={(e) => e.preventDefault()}
              className="relative flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1.5 text-sm text-text outline-none hover:bg-muted focus:bg-muted"
            >
              <div
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                  filter.checked
                    ? 'border-primary bg-primary/10'
                    : 'border-border',
                )}
              >
                {filter.checked && (
                  <Check className="h-3 w-3 text-primary" strokeWidth={3} />
                )}
              </div>
              {filter.icon && (
                <span className={cn('shrink-0', filter.colorClass)}>
                  {filter.icon}
                </span>
              )}
              <span className={cn(filter.colorClass)}>{filter.label}</span>
            </DropdownMenu.CheckboxItem>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export default DropdownFilter

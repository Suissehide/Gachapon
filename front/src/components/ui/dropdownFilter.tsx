import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronDown, X } from 'lucide-react'

import { cn } from '../../libs/utils.ts'
import { Button } from './button'

const DropdownFilter = ({
  filters,
  onFilterChange,
  onClear,
  label = 'Filtres',
}: {
  filters: { id: string; label: string; checked: boolean }[]
  onFilterChange: (id: string, checked: boolean) => void
  onClear?: () => void
  label?: string
}) => {
  const activeCount = filters.filter((f) => f.checked).length

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'gap-1.5 font-normal',
            activeCount > 0 && 'border-primary/40 text-primary',
          )}
        >
          {label}
          {activeCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
          {activeCount > 0 && onClear ? (
            <X
              className="h-3.5 w-3.5 text-text-light hover:text-text"
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
          className="z-50 min-w-[180px] rounded-md border border-border bg-popover p-1 shadow-lg shadow-black/20"
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
              {filter.label}
            </DropdownMenu.CheckboxItem>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export default DropdownFilter

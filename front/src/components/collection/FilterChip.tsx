import { cn } from '../../libs/utils.ts'
import { Button } from '../ui/button.tsx'

interface FilterChipProps {
  label: string
  isActive: boolean
  activeClass: string
  inactiveClass: string
  onClick: () => void
}

export function FilterChip({
  label,
  isActive,
  activeClass,
  inactiveClass,
  onClick,
}: FilterChipProps) {
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={onClick}
      className={cn(
        'rounded-full border h-auto px-3 py-1 text-xs font-semibold',
        isActive ? activeClass : inactiveClass,
        isActive ? 'hover:opacity-90' : 'hover:border-primary/40',
      )}
    >
      {label}
    </Button>
  )
}

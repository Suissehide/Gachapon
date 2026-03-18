import type { ReactNode } from 'react'

import { cn } from '../../libs/utils.ts'

export interface SegmentedControlOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Étire chaque option pour remplir la largeur du conteneur */
  stretch?: boolean
  className?: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  stretch = false,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex gap-0.5 rounded-xl border border-border bg-muted p-1',
        className,
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'cursor-pointer flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold border border-transparent transition-all duration-150',
              stretch && 'flex-1',
              isActive
                ? 'bg-primary/10 border-primary/25 text-text shadow-sm'
                : 'text-text-light hover:bg-background/50 hover:text-text',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

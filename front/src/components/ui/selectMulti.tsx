import { Check, ChevronDown, X } from 'lucide-react'
import { Popover } from 'radix-ui'
import type React from 'react'

import { cn } from '../../libs/utils.ts'

export type SelectMultiOption = {
  value: string
  label: string
  icon?: React.ReactNode
}

/**
 * Multi-sélection qui reprend l'apparence du `Select` de `input.tsx` :
 * même déclencheur (hauteur, bordure, fond, chevron), même liste d'options
 * avec icône facultative et coche à droite.
 *
 * `MultiSelect` (multiSelect.tsx) existe déjà, mais il s'ouvre en popover avec
 * champ de recherche et pastilles — une autre langue visuelle, faite pour
 * choisir parmi beaucoup d'entrées. Ici on filtre sur cinq raretés ou sept
 * emplacements, à côté d'un `Select` : c'est son apparence qu'il faut.
 */
export function SelectMulti({
  id,
  options,
  value,
  onChange,
  placeholder = 'Tous',
  className,
  disabled,
}: {
  id?: string
  options: SelectMultiOption[]
  value: string[]
  onChange: (value: string[]) => void
  /** Affiché quand rien n'est sélectionné — l'équivalent de « tout ». */
  placeholder?: string
  className?: string
  disabled?: boolean
}) {
  const selected = options.filter((o) => value.includes(o.value))
  const only = selected.length === 1 ? selected[0] : null

  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])

  return (
    <div className="relative w-full">
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            id={id}
            type="button"
            disabled={disabled}
            className={cn(
              'inline-flex h-[36px] w-full items-center justify-between rounded-md border border-border bg-input px-3 py-2 text-sm text-text',
              'transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring',
              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
              className,
            )}
          >
            <span
              className={cn(
                'inline-flex min-w-0 items-center gap-2 truncate',
                selected.length === 0 && 'text-text-light',
              )}
            >
              {only?.icon}
              {selected.length === 0
                ? placeholder
                : only
                  ? only.label
                  : `${selected.length} sélectionnés`}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-text-light" />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={4}
            className="z-150 min-w-[var(--radix-popover-trigger-width)] rounded-md border border-border bg-popover p-1 shadow-lg shadow-black/20"
          >
            {options.map((option) => {
              const checked = value.includes(option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggle(option.value)}
                  className="relative flex w-full cursor-pointer select-none items-center rounded px-2 py-1.5 text-left text-sm text-text hover:bg-muted focus:bg-muted focus:outline-none"
                >
                  <span className="inline-flex items-center gap-2">
                    {option.icon}
                    {option.label}
                  </span>
                  {checked && (
                    <Check className="absolute right-2 h-4 w-4 text-primary" />
                  )}
                </button>
              )
            })}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {value.length > 0 && (
        <button
          type="button"
          aria-label="Effacer le filtre"
          onClick={() => onChange([])}
          className="absolute right-8 top-1/2 -translate-y-1/2 text-text-light transition-colors hover:text-text"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

import { Minus, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '../../libs/utils.ts'
import { Button } from './button.tsx'

/** Entier borné, `min` pour une saisie vide ou invalide. */
function clamp(n: number, min: number, max: number): number {
  return Number.isFinite(n) ? Math.min(Math.max(Math.trunc(n), min), max) : min
}

/**
 * Champ entier avec boutons −/+ accolés à droite. La valeur reste saisissable
 * au clavier ; toute saisie est ramenée dans [min, max].
 */
export function NumberStepper({
  id,
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  className,
}: {
  id?: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
}) {
  const { t } = useTranslation('common')
  const stepButton =
    'h-full w-[30px] shrink-0 border-l border-foreground/8 text-foreground/55 hover:text-text'
  return (
    <div
      className={cn(
        'flex h-10 items-center overflow-hidden rounded-[11px] border border-foreground/12 bg-white focus-within:ring-2 focus-within:ring-ring',
        className,
      )}
    >
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value), min, max))}
        className="h-full w-full min-w-0 flex-1 appearance-none bg-transparent px-2.5 font-display text-[17px] font-extrabold tabular-nums text-text outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
      />
      <Button
        type="button"
        variant="ghost"
        size="bare"
        className={stepButton}
        aria-label={t('common:stepper.decrease')}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - step, min, max))}
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="bare"
        className={stepButton}
        aria-label={t('common:stepper.increase')}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + step, min, max))}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

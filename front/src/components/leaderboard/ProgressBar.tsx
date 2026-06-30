type Variant = 'cards' | 'variants' | 'combat'

const FILL: Record<Variant, string> = {
  cards: 'linear-gradient(90deg, #f59e0b, #ec4899)',
  variants: 'linear-gradient(90deg, #8b5cf6, #3b82f6)',
  combat: 'linear-gradient(90deg, #ef4444, #f59e0b)',
}

type Props = {
  value: number               // 0..100
  variant: Variant
  label?: string              // shown above-left in font-mono
  displayValue?: string       // overrides the default "N%" right-side display
}

export function ProgressBar({ value, variant, label, displayValue }: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className="min-w-0">
      {(label || displayValue) && (
        <div className="mb-[6px] flex items-baseline justify-between">
          {label && (
            <span className="font-mono text-[9px] tracking-[0.15em] text-[rgba(27,23,38,0.5)]">
              {label}
            </span>
          )}
          {displayValue && (
            <span className="font-display text-[16px] font-extrabold leading-none text-[#1b1726] tabular-nums">
              {displayValue}
            </span>
          )}
        </div>
      )}
      <div className="h-2 overflow-hidden rounded bg-[rgba(27,23,38,0.06)]">
        <div
          className="h-full rounded"
          style={{ width: `${pct}%`, background: FILL[variant] }}
        />
      </div>
    </div>
  )
}

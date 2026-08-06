type FloatKind = 'damage' | 'heal' | 'dodge'

type Props = {
  value: number | string
  kind: FloatKind
  /** Multiplicateur élémentaire appliqué ; absent ou 1 = frappe neutre. */
  elementMult?: number
}

export function FloatingNumber({ value, kind, elementMult }: Props) {
  const isAdvantage = elementMult !== undefined && elementMult > 1
  const isDisadvantage = elementMult !== undefined && elementMult < 1
  const color =
    kind === 'damage'
      ? isAdvantage
        ? 'text-orange-300'
        : isDisadvantage
          ? 'text-rose-400/60'
          : 'text-rose-400'
      : kind === 'heal'
        ? 'text-emerald-300'
        : 'text-sky-300'
  const prefix = kind === 'heal' ? '+' : kind === 'damage' ? '-' : ''
  const marker = isAdvantage ? '▲' : isDisadvantage ? '▼' : ''
  return (
    <span
      className={`pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 animate-[floatUp_800ms_ease-out_forwards] font-display text-base font-bold tabular-nums ${color}`}
      title={
        isAdvantage
          ? 'Avantage élémentaire'
          : isDisadvantage
            ? 'Désavantage élémentaire'
            : undefined
      }
    >
      {marker && <span className="mr-0.5 text-[11px]">{marker}</span>}
      {prefix}
      {value}
    </span>
  )
}

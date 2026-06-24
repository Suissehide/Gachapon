type FloatKind = 'damage' | 'heal' | 'dodge'

type Props = {
  value: number | string
  kind: FloatKind
}

export function FloatingNumber({ value, kind }: Props) {
  const color =
    kind === 'damage'
      ? 'text-rose-400'
      : kind === 'heal'
        ? 'text-emerald-300'
        : 'text-sky-300'
  const prefix = kind === 'heal' ? '+' : kind === 'damage' ? '-' : ''
  return (
    <span
      className={`pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 animate-[floatUp_800ms_ease-out_forwards] font-display text-base font-bold tabular-nums ${color}`}
    >
      {prefix}
      {value}
    </span>
  )
}

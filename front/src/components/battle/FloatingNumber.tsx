type FloatKind = 'damage' | 'heal' | 'dodge'
type ElementVariant = 'advantage' | 'disadvantage' | 'neutral'

type Props = {
  value: number | string
  kind: FloatKind
  /** Multiplicateur élémentaire appliqué ; absent ou 1 = frappe neutre. */
  elementMult?: number
}

function resolveVariant(elementMult: number | undefined): ElementVariant {
  if (elementMult === undefined) {
    return 'neutral'
  }
  if (elementMult > 1) {
    return 'advantage'
  }
  if (elementMult < 1) {
    return 'disadvantage'
  }
  return 'neutral'
}

function resolveDamageColor(variant: ElementVariant): string {
  if (variant === 'advantage') {
    return 'text-orange-300'
  }
  if (variant === 'disadvantage') {
    return 'text-rose-400/60'
  }
  return 'text-rose-400'
}

function resolveColor(kind: FloatKind, variant: ElementVariant): string {
  if (kind === 'damage') {
    return resolveDamageColor(variant)
  }
  if (kind === 'heal') {
    return 'text-emerald-300'
  }
  return 'text-sky-300'
}

function resolvePrefix(kind: FloatKind): string {
  if (kind === 'heal') {
    return '+'
  }
  if (kind === 'damage') {
    return '-'
  }
  return ''
}

function resolveMarker(variant: ElementVariant): string {
  if (variant === 'advantage') {
    return '▲'
  }
  if (variant === 'disadvantage') {
    return '▼'
  }
  return ''
}

function resolveTitle(variant: ElementVariant): string | undefined {
  if (variant === 'advantage') {
    return 'Avantage élémentaire'
  }
  if (variant === 'disadvantage') {
    return 'Désavantage élémentaire'
  }
  return undefined
}

export function FloatingNumber({ value, kind, elementMult }: Props) {
  const variant = resolveVariant(elementMult)
  const color = resolveColor(kind, variant)
  const prefix = resolvePrefix(kind)
  const marker = resolveMarker(variant)
  const title = resolveTitle(variant)
  return (
    <span
      className={`pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 animate-[floatUp_800ms_ease-out_forwards] font-display text-base font-bold tabular-nums ${color}`}
      title={title}
    >
      {marker && <span className="mr-0.5 text-[11px]">{marker}</span>}
      {prefix}
      {value}
    </span>
  )
}

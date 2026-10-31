import type { CSSProperties } from 'react'

import { cn } from '../../libs/utils.ts'
import {
  type CapsuleKind,
  capsuleTint,
  ELEMENT_CAPSULE_KINDS,
} from '../machine/capsule/capsuleConfig'

// Pastille de capsule : moitié haute / moitié basse, comme la capsule 3D. Les
// capsules teintées reprennent la classique avec leur couleur en bas.
function swatchStyle(kind: CapsuleKind | 'elemental'): CSSProperties {
  if (kind === 'elemental') {
    // Les quatre éléments en quartiers dans la moitié basse.
    const [fire, water, nature, earth] = ELEMENT_CAPSULE_KINDS.map(capsuleTint)
    return {
      background: `linear-gradient(180deg, var(--card) 50%, transparent 50%), conic-gradient(from 90deg, ${fire} 0 12.5%, ${water} 0 25%, ${nature} 0 37.5%, ${earth} 0 50%, transparent 0)`,
      boxShadow: 'inset 0 0 0 1px var(--border-dark)',
    }
  }
  if (kind === 'astral') {
    return {
      background:
        'linear-gradient(180deg, var(--astral-day-sky), var(--astral-day-haze) 50%, var(--astral-night-violet) 50%, var(--astral-night-deep))',
      boxShadow: '0 0 6px var(--astral-night-violet)',
    }
  }
  return {
    background: `linear-gradient(180deg, var(--card) 50%, ${capsuleTint(kind) ?? 'var(--primary)'} 50%)`,
    boxShadow: 'inset 0 0 0 1px var(--border-dark)',
  }
}

export function CapsuleSwatch({
  kind,
  className,
}: {
  kind: CapsuleKind | 'elemental'
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn('h-4 w-4 shrink-0 rounded-full', className)}
      style={swatchStyle(kind)}
    />
  )
}

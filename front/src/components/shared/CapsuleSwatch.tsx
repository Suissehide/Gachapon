import type { CSSProperties } from 'react'

import { cn } from '../../libs/utils.ts'
import {
  type CapsuleKind,
  capsuleTint,
  ELEMENT_CAPSULE_KINDS,
} from '../machine/capsule/capsuleConfig'

const RIM = 'inset 0 0 0 1.5px var(--border)'

// Pastille de capsule : moitié haute blanche, moitié basse à la couleur de la
// capsule, comme la capsule 3D. L'astrale porte ses bandes or / nuit, la
// pastille « élémentaire » (en-tête de boutique) les quatre éléments.
function swatchStyle(kind: CapsuleKind | 'elemental'): CSSProperties {
  if (kind === 'elemental') {
    const [fire, water, nature, earth] = ELEMENT_CAPSULE_KINDS.map(capsuleTint)
    return {
      background: `conic-gradient(${fire} 0 25%, ${water} 0 50%, ${nature} 0 75%, ${earth} 0)`,
      boxShadow: RIM,
    }
  }
  if (kind === 'astral') {
    return {
      background:
        'linear-gradient(180deg, var(--card) 0 44%, var(--astral-band-light) 44% 72%, var(--astral-band-dark) 72%)',
      boxShadow: RIM,
    }
  }
  return {
    background: `linear-gradient(180deg, var(--card) 50%, ${capsuleTint(kind) ?? 'var(--primary)'} 50%)`,
    boxShadow: RIM,
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
      className={cn('h-[18px] w-[18px] shrink-0 rounded-full', className)}
      style={swatchStyle(kind)}
    />
  )
}

// StatTile — petite tuile valeur + libellé, utilisée 4x dans la carte
// d'identité d'équipe (membres, classement, points hebdo, raids vaincus).
// Valeurs reprises de `docs/design_handoff_equipe/equipe.css` (`.tmB-fact`) :
// fond `--muted` (#fafaf7), radius 13px, bordure rgba(27,23,38,.06) — pas de
// token exact pour cette bordure, reconstruite depuis `--foreground` à 6 %
// d'opacité plutôt qu'inlinée en dur.
import type { ReactNode } from 'react'

import { cn } from '../../libs/utils.ts'

type StatTileProps = {
  value: ReactNode
  label: string
  className?: string
}

export function StatTile({ value, label, className }: StatTileProps) {
  return (
    <div
      className={cn(
        'rounded-[13px] border border-foreground/6 bg-muted p-[11px] text-left',
        className,
      )}
    >
      <span className="block font-display text-[19px] font-extrabold text-text">
        {value}
      </span>
      <span className="font-mono text-[9px] tracking-[0.12em] text-foreground/45">
        {label}
      </span>
    </div>
  )
}

// GradedHpBar — barre de PV graduée du raid d'équipe, l'élément clé du
// handoff (`docs/design_handoff_equipe/equipe.css`, blocs `.tm-hp*`).
// Valeurs reprises telles quelles : piste 26px / radius 13px / fond
// `--track` (#f3ede4), remplissage en dégradé `primary → destructive` avec
// hachures, un trait de graduation par palier de récompense.
//
// Le dernier palier correspond toujours à 100 % — donc à l'extrémité même de
// la piste. Y dessiner un trait de graduation dessinerait une bordure
// parasite collée au bord droit : on l'exclut systématiquement, quelle que
// soit sa position dans le tableau `tiers`.
import { cn } from '../../libs/utils.ts'

type GradedHpBarProps = {
  /** Progression actuelle (ex : dégâts infligés au boss). */
  done: number
  /** Total à atteindre (ex : PV max du boss). */
  max: number
  /** Seuils de palier en pourcentage (0-100), ex : [25, 50, 75, 100]. */
  tiers: number[]
  /** Affiche le texte `done / max PV` par-dessus la piste. Défaut : true. */
  showValue?: boolean
  className?: string
}

export function GradedHpBar({
  done,
  max,
  tiers,
  showValue = true,
  className,
}: GradedHpBarProps) {
  const fraction = max > 0 ? Math.min(1, Math.max(0, done / max)) : 0
  const percent = fraction * 100

  // Un trait par palier, sauf le dernier (100 % = extrémité de la piste) —
  // et défensivement, tout seuil qui atteindrait déjà 100 % ailleurs dans le
  // tableau, pour la même raison.
  const ticks = tiers.slice(0, -1).filter((t) => t > 0 && t < 100)

  return (
    <div className={cn('relative pt-1', className)}>
      <div className="relative h-[26px] overflow-hidden rounded-[13px] border-[1.5px] border-border bg-track">
        <div
          className="absolute inset-y-0 left-0 rounded-[13px_6px_6px_13px] bg-gradient-to-r from-primary to-destructive shadow-[0_0_18px_-2px_rgba(239,68,68,0.5)] after:absolute after:inset-0 after:bg-[repeating-linear-gradient(115deg,rgba(255,255,255,0.16)_0_8px,transparent_8px_18px)]"
          style={{ width: `${percent}%` }}
        />
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 bg-foreground/18"
            style={{ left: `${t}%` }}
          />
        ))}
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-end pr-3 font-mono text-xs font-bold tracking-[0.06em] text-text-light">
            {done.toLocaleString('fr-FR')} / {max.toLocaleString('fr-FR')} PV
          </div>
        )}
      </div>
    </div>
  )
}

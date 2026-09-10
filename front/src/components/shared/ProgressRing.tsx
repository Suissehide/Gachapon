// ProgressRing — anneau de progression SVG partagé par les écrans « Équipe ».
// Rien de tel n'existait dans le dépôt : valeurs reprises telles quelles du
// handoff `docs/design_handoff_equipe/equipe.css` (bloc `.tmB-ring`) —
// viewBox 120x120, cercle r=52, piste `--border`, dégradé primary → secondary,
// arc qui démarre en haut (`rotate(-90 60 60)`) plutôt qu'à 3 h.
import type { ReactNode } from 'react'
import { useId } from 'react'

import { cn } from '../../libs/utils.ts'

type ProgressRingProps = {
  /** Valeur courante de la progression (ex : XP acquise). */
  value: number
  /** Valeur au complet de l'anneau (ex : XP requise pour le niveau suivant). */
  max: number
  /** Diamètre de l'anneau en pixels. */
  size?: number
  /** Contenu central principal (ex : le niveau). */
  label?: ReactNode
  /** Contenu central secondaire, sous `label` (ex : « NIVEAU »). */
  sublabel?: ReactNode
  className?: string
}

const RADIUS = 52
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function ProgressRing({
  value,
  max,
  size = 132,
  label,
  sublabel,
  className,
}: ProgressRingProps) {
  const gradientId = useId()
  // Clamp entre 0 et 1 : une valeur négative ou dépassant `max` ne doit ni
  // vider l'anneau au-delà de zéro trait, ni le faire déborder.
  const fraction = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
  const dashoffset = CIRCUMFERENCE * (1 - fraction)

  return (
    <div
      className={cn('relative', className)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 120 120"
        className="h-full w-full"
        role="img"
        aria-label={
          typeof label === 'string' && typeof sublabel === 'string'
            ? `${label} ${sublabel}`
            : undefined
        }
      >
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          stroke="var(--border)"
          strokeWidth="10"
        />
        {/* `fraction === 0` ne doit rendre aucun trait — pas un cercle plein
            (dashoffset égal à la circonférence), pas un point parasite (le
            cap arrondi d'un tracé de longueur nulle peut laisser une trace
            à cause des arrondis flottants). Le plus sûr est de ne pas
            monter cet arc du tout quand il n'y a rien à montrer. */}
        {fraction > 0 && (
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashoffset}
            transform="rotate(-90 60 60)"
          />
        )}
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--secondary)" />
          </linearGradient>
        </defs>
      </svg>
      {(label !== undefined || sublabel !== undefined) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center font-display">
          {label !== undefined && (
            <span className="text-[38px] font-extrabold leading-none text-text">
              {label}
            </span>
          )}
          {sublabel !== undefined && (
            <span className="mt-[3px] font-mono text-[9px] tracking-[0.18em] text-foreground/45">
              {sublabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

import type { ReactNode } from 'react'

import type { CardDrop } from '../../api/campaign.api.ts'
import type { CardElement } from '../../constants/card.constant.ts'
import { cn } from '../../libs/utils.ts'
import { TcgCardFace } from '../shared/tcg-card/TcgCardFace.tsx'

// Shared visual language for the battle-result popups (victory / defeat) and the
// campaign farm-result popup, so they stay uniform. The animations referenced
// here (`battleResultIn`, `battleBadgePop`) are global keyframes.

// Outer shell: rounded cream panel that slides in, with an optional amber halo
// burst behind the badge. Children are stacked and centered.
//
// C'est ici que vit la hauteur max : `PopupContent` est seulement centré en
// `fixed`, sans plafond ni défilement, donc un panneau plus haut que la
// fenêtre (une victoire avec carte + équipement + barre d'XP, par exemple)
// débordait hors écran, boutons compris, sans moyen d'y accéder.
export function ResultPanel({
  halo = false,
  children,
}: {
  halo?: boolean
  children: ReactNode
}) {
  return (
    <div className="relative max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden overscroll-contain rounded-[26px] px-6 py-8 sm:px-8 animate-[battleResultIn_0.4s_ease]">
      {halo && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-48"
          style={{
            background:
              'radial-gradient(50% 60% at 50% 50%, rgba(245,158,11,0.3), transparent 70%)',
          }}
          aria-hidden
        />
      )}
      <div className="relative flex flex-col items-center text-center">
        {children}
      </div>
    </div>
  )
}

// Circular gradient badge with a pop animation. `className` carries the gradient
// + shadow (amber for a win, slate for a loss).
export function ResultBadge({
  icon,
  className,
}: {
  icon: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex h-16 w-16 items-center justify-center rounded-full text-white animate-[battleBadgePop_0.5s_cubic-bezier(0.2,1.6,0.4,1)]',
        className,
      )}
    >
      {icon}
    </div>
  )
}

export const RESULT_BADGE_WIN =
  'bg-gradient-to-br from-amber-400 to-orange-500 shadow-[0_12px_28px_-8px_rgba(245,158,11,0.7)]'
export const RESULT_BADGE_LOSS =
  'bg-gradient-to-br from-slate-400 to-slate-600 shadow-md'
// Draw / timeout — indigo, distinct from both the amber win and the slate loss.
export const RESULT_BADGE_TIMEOUT =
  'bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-md'

export function RewardTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode
  label: string
  value: number
  tone: string
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-white p-3">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${tone}1f`, color: tone }}
      >
        {icon}
      </span>
      <b className="font-display text-lg tabular-nums text-text">
        +{value.toLocaleString('fr-FR')}
      </b>
      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-text-light/70">
        {label}
      </span>
    </div>
  )
}

/**
 * Carte obtenue, dessinée plutôt que décrite : c'est le seul moment où on la
 * découvre, la réduire à une ligne de texte gâchait la récompense. Partagé par
 * l'écran de victoire et le résultat de balayage, qui affichaient jusqu'ici
 * deux rendus différents pour le même gain.
 */
export function CardDropReward({
  drop,
  className,
}: {
  drop: CardDrop
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-light/60">
        {drop.wasDuplicate ? 'Carte · doublon' : 'Carte'}
      </span>
      <div className="relative aspect-[2/3] w-[150px]">
        <TcgCardFace
          rarity={drop.rarity}
          name={drop.name}
          setName={drop.setName}
          imageUrl={drop.imageUrl}
          variant="NORMAL"
          isOwned
          element={(drop.element ?? null) as CardElement | null}
        />
      </div>
    </div>
  )
}

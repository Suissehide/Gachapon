import { Skull } from 'lucide-react'

import type { SceneUnit } from './types'

type Props = {
  unit: SceneUnit
  /** Hop direction when attacking — 'up' makes the unit translate up (player attacking enemy), 'down' the opposite. */
  attackingDirection: 'up' | 'down' | null
  /** Boss layout = bigger portrait */
  enlarged?: boolean
  /** Show passive badge label (optional) */
  passiveBadge?: string | null
  /** Position on the floating number layer, if any */
  damageFloat?: { value: number; key: number; kind: 'damage' | 'heal' | 'dodge' } | null
}

export function UnitPortrait({ unit, attackingDirection, enlarged }: Props) {
  const hpPct = Math.max(0, (unit.currentHp / unit.maxHp) * 100)
  const isDead = !unit.alive

  const hopClass =
    attackingDirection === 'up'
      ? '-translate-y-4'
      : attackingDirection === 'down'
        ? 'translate-y-4'
        : ''

  return (
    <div
      className={`relative flex flex-col items-center transition-transform duration-200 ${hopClass} ${
        isDead ? 'opacity-40 grayscale' : ''
      } ${enlarged ? 'scale-150' : ''}`}
      style={{ transformOrigin: 'center center' }}
    >
      {/* Portrait box */}
      <div
        className={`relative flex h-24 w-20 items-center justify-center overflow-hidden rounded-xl border-2 bg-white shadow-md transition-all ${
          unit.side === 'A'
            ? 'border-emerald-400/60'
            : 'border-rose-400/60'
        }`}
      >
        {unit.imageUrl ? (
          <img
            src={unit.imageUrl}
            alt={unit.name ?? unit.id}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <span className="font-display text-2xl font-bold text-text-light/40">
            {unit.id}
          </span>
        )}
        {isDead && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Skull className="h-7 w-7 text-rose-200" />
          </div>
        )}
      </div>

      {/* Name */}
      <p className="mt-1 max-w-[6rem] truncate text-center text-[10px] font-semibold text-text">
        {unit.name ?? unit.id}
      </p>

      {/* HP bar */}
      <div className="mt-1 w-20 overflow-hidden rounded-full border border-border bg-muted/30">
        <div
          className={`h-1.5 transition-all duration-300 ease-out ${
            hpPct > 50 ? 'bg-emerald-500' : hpPct > 20 ? 'bg-amber-500' : 'bg-rose-500'
          }`}
          style={{ width: `${hpPct}%` }}
        />
      </div>
      <p className="mt-0.5 font-mono text-[10px] tabular-nums text-text-light/70">
        {Math.max(0, Math.round(unit.currentHp)).toLocaleString('fr-FR')} /{' '}
        {unit.maxHp.toLocaleString('fr-FR')}
      </p>
    </div>
  )
}

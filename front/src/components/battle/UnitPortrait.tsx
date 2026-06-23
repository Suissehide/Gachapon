import type { SceneUnit } from './types'

type Props = {
  unit: SceneUnit
  /** Hop direction when attacking — 'left' makes the unit translate left, 'right' translate right. */
  attackingDirection: 'left' | 'right' | null
  /** Boss layout = bigger portrait */
  enlarged?: boolean
  /** Show passive badge label (optional, T4.2 will pass a value here) */
  passiveBadge?: string | null
  /** Position on the floating number layer, if any */
  damageFloat?: { value: number; key: number; kind: 'damage' | 'heal' | 'dodge' } | null
}

export function UnitPortrait({ unit, attackingDirection, enlarged }: Props) {
  const hpPct = Math.max(0, (unit.currentHp / unit.maxHp) * 100)
  const isDead = !unit.alive

  const hopClass =
    attackingDirection === 'left'
      ? '-translate-x-4'
      : attackingDirection === 'right'
        ? 'translate-x-4'
        : ''

  return (
    <div
      className={`relative flex flex-col items-center transition-transform duration-200 ${hopClass} ${
        isDead ? 'opacity-40 grayscale' : ''
      } ${enlarged ? 'scale-150' : ''}`}
      style={{ transformOrigin: 'center bottom' }}
    >
      {/* Portrait box */}
      <div
        className={`flex h-24 w-20 items-center justify-center rounded-xl border bg-gradient-to-br shadow-lg transition-all ${
          unit.side === 'A'
            ? 'border-emerald-500/40 from-emerald-500/15 to-emerald-700/10'
            : 'border-rose-500/40 from-rose-500/15 to-rose-700/10'
        }`}
      >
        <span className="font-display text-2xl font-bold text-white/90">{unit.id}</span>
      </div>

      {/* Name */}
      <p className="mt-1 text-center text-[10px] font-semibold text-white/70">
        {unit.name ?? unit.id}
      </p>

      {/* HP bar */}
      <div className="mt-1 w-20 overflow-hidden rounded-full border border-white/15 bg-black/50">
        <div
          className={`h-1.5 transition-all duration-300 ease-out ${
            hpPct > 50 ? 'bg-emerald-400' : hpPct > 20 ? 'bg-amber-400' : 'bg-rose-500'
          }`}
          style={{ width: `${hpPct}%` }}
        />
      </div>
      <p className="mt-0.5 text-[10px] font-mono text-white/55">
        {Math.max(0, Math.round(unit.currentHp)).toLocaleString('fr-FR')} /{' '}
        {unit.maxHp.toLocaleString('fr-FR')}
      </p>
    </div>
  )
}

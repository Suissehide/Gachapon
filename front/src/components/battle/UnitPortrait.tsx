import { Skull } from 'lucide-react'

import { CardDisplay } from '../shared/tcg-card/CardDisplay.tsx'
import { getRarityTone } from '../shared/tcg-card/config.ts'
import type { SceneUnit } from './types'

type Props = {
  unit: SceneUnit
  /** Whether this unit is currently the attacker (triggers the lunge animation). */
  isActing: boolean
  /** Whether this unit is the current target (triggers the shake animation). */
  isTargeted: boolean
  /** Boss layout = bigger portrait centered (boss is alone in its row). */
  enlarged?: boolean
  /** Show passive badge label (optional) */
  passiveBadge?: string | null
  /** Position on the floating number layer, if any */
  damageFloat?: {
    value: number
    key: number
    kind: 'damage' | 'heal' | 'dodge'
  } | null
}

const PLACEHOLDER_RARITY = 'COMMON' as const

export function UnitPortrait({
  unit,
  isActing,
  isTargeted,
  enlarged,
}: Props) {
  const hpPct = Math.max(0, (unit.currentHp / unit.maxHp) * 100)
  const isDead = !unit.alive
  const isAlly = unit.side === 'A'

  // Three-tier HP color: green (>60%) → orange (30–60%) → red (<30%).
  const hpBarClass =
    hpPct <= 30
      ? 'bg-gradient-to-r from-rose-500 to-red-600'
      : hpPct <= 60
        ? 'bg-gradient-to-r from-orange-400 to-amber-500'
        : isAlly
          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
          : 'bg-gradient-to-r from-emerald-400 to-emerald-500'

  // Players (side A) sit at the bottom and lunge UP. Enemies (side B) sit at the
  // top and lunge DOWN. Targeted units shake regardless of side.
  const animClass = isActing
    ? isAlly
      ? 'animate-[battleLungeUp_0.4s_ease]'
      : 'animate-[battleLungeDown_0.4s_ease]'
    : isTargeted
      ? 'animate-[battleShake_0.32s_ease]'
      : ''

  const ringClass = isActing
    ? 'ring-4 ring-amber-400/60 shadow-[0_14px_30px_-12px_rgba(245,158,11,0.55)]'
    : ''

  return (
    <div
      className={`relative flex flex-col items-center gap-2 transition-transform ${animClass} ${
        enlarged ? 'scale-[1.18]' : ''
      }`}
      style={{ transformOrigin: 'center center' }}
    >
      {/* Card area */}
      <div
        className={`relative w-full transition-all ${ringClass} ${
          isDead ? 'grayscale brightness-95' : ''
        } rounded-[14px]`}
      >
        <div className="relative aspect-[2/3] w-full">
          <CardDisplay
            rarity={unit.rarity ?? PLACEHOLDER_RARITY}
            name={unit.name ?? unit.id}
            setName={unit.setName ?? (isAlly ? 'Combat' : 'Adversaire')}
            imageUrl={unit.imageUrl ?? null}
            variant={unit.variant ?? 'NORMAL'}
            isOwned
            interactive={false}
            compact
          />
          {/* Level badge — allies only, sits over the top-left corner. */}
          {isAlly && unit.level != null && (
            <div className="pointer-events-none absolute top-2 left-2 z-20">
              <LevelBadge level={unit.level} rarity={unit.rarity} />
            </div>
          )}
          {isDead && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center animate-[battleSkullIn_0.3s_ease]">
              <Skull className="h-12 w-12 text-text-light drop-shadow-md" />
            </div>
          )}
        </div>
      </div>

      {/* HP bar */}
      <div className="w-full">
        <div className="relative h-2 overflow-hidden rounded-full bg-[rgba(27,23,38,0.1)]">
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-[width,background] duration-300 ease-out ${hpBarClass}`}
            style={{ width: `${hpPct}%` }}
          />
        </div>
        <p className="mt-1 text-center font-mono text-[11px] tabular-nums text-text-light">
          {Math.max(0, Math.round(unit.currentHp)).toLocaleString('fr-FR')}{' '}
          <span className="opacity-60">
            / {unit.maxHp.toLocaleString('fr-FR')}
          </span>
        </p>
      </div>
    </div>
  )
}

function LevelBadge({
  level,
  rarity,
}: {
  level: number
  rarity?: string | null
}) {
  const tone = getRarityTone(rarity ?? 'COMMON')
  return (
    <div
      className="flex h-7 min-w-[28px] items-center justify-center rounded-[7px] border-[0.5px] border-white px-1 font-display text-[13px] font-extrabold leading-none text-white shadow-[0_2px_6px_rgba(0,0,0,0.4)]"
      style={{ background: tone.hex }}
    >
      {level}
    </div>
  )
}

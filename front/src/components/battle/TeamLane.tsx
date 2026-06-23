import { UnitPortrait } from './UnitPortrait'
import type { SceneUnit } from './types'

type Props = {
  units: SceneUnit[]
  /** Side this lane represents */
  side: 'A' | 'B'
  /** Attacking unit id (for hop animation) */
  attackingUnitId: string | null
  /** Boss layout: 1 unit centered + enlarged */
  isBoss?: boolean
}

export function TeamLane({ units, side, attackingUnitId, isBoss }: Props) {
  // Boss: only 1 unit, enlarged, centered
  if (isBoss && units.length === 1) {
    const unit = units[0]
    return (
      <div className="flex h-full items-center justify-center">
        <UnitPortrait
          unit={unit}
          attackingDirection={
            attackingUnitId === unit.id ? (side === 'A' ? 'right' : 'left') : null
          }
          enlarged
        />
      </div>
    )
  }

  // Standard lane: row of portraits
  return (
    <div className="flex h-full items-center justify-center gap-4">
      {units.map((u) => (
        <UnitPortrait
          key={u.id}
          unit={u}
          attackingDirection={
            attackingUnitId === u.id ? (side === 'A' ? 'right' : 'left') : null
          }
        />
      ))}
    </div>
  )
}

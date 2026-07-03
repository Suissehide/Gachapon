import { FloatingNumber } from './FloatingNumber'
import { PassiveBadge } from './PassiveBadge'
import { UnitPortrait } from './UnitPortrait'
import type { SceneUnit } from './types'

type FloatItem = {
  key: number
  value: number | string
  kind: 'damage' | 'heal' | 'dodge'
}
type BadgeItem = { key: number; passiveKey: string }

type Props = {
  units: SceneUnit[]
  /** Side this lane represents */
  side: 'A' | 'B'
  /** Attacking unit id (for hop animation) */
  attackingUnitId: string | null
  /** Boss layout: 1 unit centered + enlarged */
  isBoss?: boolean
  floatsByUnit: Record<string, FloatItem[]>
  badgesByUnit: Record<string, BadgeItem[]>
}

export function TeamLane({
  units,
  side,
  attackingUnitId,
  isBoss,
  floatsByUnit,
  badgesByUnit,
}: Props) {
  const renderUnit = (u: SceneUnit, enlarged?: boolean) => (
    <div key={u.id} className="relative">
      <UnitPortrait
        unit={u}
        isActing={attackingUnitId === u.id}
        isTargeted={false}
        enlarged={enlarged}
      />
      {(floatsByUnit[u.id] ?? []).map((f) => (
        <FloatingNumber key={f.key} value={f.value} kind={f.kind} />
      ))}
      {(badgesByUnit[u.id] ?? []).map((b) => (
        <PassiveBadge key={b.key} passiveKey={b.passiveKey} />
      ))}
    </div>
  )

  // Boss: only 1 unit, enlarged, centered
  if (isBoss && units.length === 1) {
    return (
      <div className="flex h-full items-center justify-center">
        {renderUnit(units[0], true)}
      </div>
    )
  }

  // Standard lane: row of portraits
  return (
    <div className="flex h-full items-center justify-center gap-4">
      {units.map((u) => renderUnit(u))}
    </div>
  )
}

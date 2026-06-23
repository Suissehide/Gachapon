import { useEffect, useMemo, useRef, useState } from 'react'

import type { BattleLogEntry, SimulatorUnit } from '../../api/combat.api'
import { TeamLane } from './TeamLane'
import type { SceneSpeed, SceneUnit } from './types'

type Props = {
  teamA: SimulatorUnit[]
  teamB: SimulatorUnit[]
  log: BattleLogEntry[]
  speed?: SceneSpeed
  /** When true, skips animation and shows final state instantly. */
  skip?: boolean
  onComplete?: (winner: 'A' | 'B' | null) => void
}

const BASE_ENTRY_DELAY_MS = 600
const HOP_DURATION_MS = 200

// Apply a single log entry to the unit state. Returns updated units.
function applyEntry(entry: BattleLogEntry, units: SceneUnit[]): SceneUnit[] {
  switch (entry.type) {
    case 'ATTACK': {
      const damages = entry.damages as { id: string; final: number; dodged: boolean }[]
      return units.map((u) => {
        const d = damages.find((d) => d.id === u.id)
        if (!d || d.dodged) {
          return u
        }
        const next = Math.max(0, u.currentHp - d.final)
        return { ...u, currentHp: next, alive: u.alive && next > 0 }
      })
    }
    case 'PASSIVE': {
      const unitId = entry.unitId as string
      const payload = (entry.payload as { healed?: number; reflected?: number }) ?? {}
      if (payload.healed && payload.healed > 0) {
        return units.map((u) =>
          u.id === unitId
            ? { ...u, currentHp: Math.min(u.maxHp, u.currentHp + (payload.healed as number)) }
            : u,
        )
      }
      if (payload.reflected && payload.reflected > 0) {
        // Reflected damage to attacker. We don't know the attacker from PASSIVE alone — it's
        // implicit. The simulator's RIPOSTE log already accounts for it in DEATH entries when
        // applicable, so the simplest approach is no-op here.
        return units
      }
      return units
    }
    case 'DEATH': {
      const unitId = entry.unitId as string
      return units.map((u) => (u.id === unitId ? { ...u, alive: false, currentHp: 0 } : u))
    }
    case 'REBIRTH': {
      const unitId = entry.unitId as string
      const hp = entry.restoredHp as number
      return units.map((u) => (u.id === unitId ? { ...u, alive: true, currentHp: hp } : u))
    }
    default:
      return units
  }
}

export function BattleScene({ teamA, teamB, log, speed = 1, skip, onComplete }: Props) {
  const initialUnits = useMemo<SceneUnit[]>(() => {
    const mapSide = (units: SimulatorUnit[], side: 'A' | 'B'): SceneUnit[] =>
      units.map((u) => ({
        ...u,
        maxHp: u.hp,
        currentHp: u.hp,
        alive: true,
        side,
      }))
    return [...mapSide(teamA, 'A'), ...mapSide(teamB, 'B')]
  }, [teamA, teamB])

  const [units, setUnits] = useState<SceneUnit[]>(initialUnits)
  const [logIndex, setLogIndex] = useState(0)
  const [attackingId, setAttackingId] = useState<string | null>(null)
  const completedRef = useRef(false)

  // Skip mode: apply all entries at once
  useEffect(() => {
    if (!skip) {
      return
    }
    let acc = initialUnits
    for (const entry of log) {
      acc = applyEntry(entry, acc)
    }
    setUnits(acc)
    setLogIndex(log.length)
    if (!completedRef.current) {
      completedRef.current = true
      const winner = log.find((e) => e.type === 'WIN') as { side?: 'A' | 'B' } | undefined
      onComplete?.(winner?.side ?? null)
    }
  }, [skip, log, initialUnits, onComplete])

  // Animation loop: advance through log entries with delay
  useEffect(() => {
    if (skip) {
      return
    }
    if (logIndex >= log.length) {
      if (!completedRef.current && log.length > 0) {
        completedRef.current = true
        const winner = log.find((e) => e.type === 'WIN') as { side?: 'A' | 'B' } | undefined
        onComplete?.(winner?.side ?? null)
      }
      return
    }
    const entry = log[logIndex]
    const delay = BASE_ENTRY_DELAY_MS / speed

    // ATTACK: trigger hop, then apply damage after HOP_DURATION_MS
    if (entry.type === 'ATTACK') {
      setAttackingId(entry.attackerId as string)
      const hopTimer = setTimeout(() => {
        setUnits((cur) => applyEntry(entry, cur))
        setAttackingId(null)
      }, HOP_DURATION_MS / speed)
      const nextTimer = setTimeout(() => {
        setLogIndex((i) => i + 1)
      }, delay)
      return () => {
        clearTimeout(hopTimer)
        clearTimeout(nextTimer)
      }
    }

    // Non-attack: apply immediately, advance after delay
    setUnits((cur) => applyEntry(entry, cur))
    const t = setTimeout(() => setLogIndex((i) => i + 1), delay / 2)
    return () => clearTimeout(t)
  }, [logIndex, log, speed, skip, onComplete])

  const teamAUnits = units.filter((u) => u.side === 'A')
  const teamBUnits = units.filter((u) => u.side === 'B')
  const isBossOnA = teamAUnits.length === 1 && teamBUnits.length > 1
  const isBossOnB = teamBUnits.length === 1 && teamAUnits.length > 1

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 via-slate-950 to-black p-8">
      <div className="grid min-h-[280px] grid-cols-2 gap-8">
        <TeamLane
          units={teamAUnits}
          side="A"
          attackingUnitId={attackingId}
          isBoss={isBossOnA}
        />
        <TeamLane
          units={teamBUnits}
          side="B"
          attackingUnitId={attackingId}
          isBoss={isBossOnB}
        />
      </div>
      {/* Turn counter (small, bottom right) */}
      <div className="absolute right-3 bottom-2 font-mono text-[10px] text-white/30">
        log {logIndex}/{log.length}
      </div>
    </div>
  )
}

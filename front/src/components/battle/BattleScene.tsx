import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { BattleLogEntry, SimulatorUnit } from '../../api/combat.api'
import { BattleControls } from './BattleControls'
import { TeamLane } from './TeamLane'
import type { SceneSpeed, SceneUnit } from './types'

type Props = {
  teamA: SimulatorUnit[]
  teamB: SimulatorUnit[]
  log: BattleLogEntry[]
  controls?: boolean
  onComplete?: (winner: 'A' | 'B' | null) => void
}

const BASE_ENTRY_DELAY_MS = 600
const HOP_DURATION_MS = 200
const FLOAT_DURATION_MS = 900

type FloatItem = {
  key: number
  value: number | string
  kind: 'damage' | 'heal' | 'dodge'
}
type BadgeItem = { key: number; passiveKey: string }

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
            ? {
                ...u,
                currentHp: Math.min(u.maxHp, u.currentHp + (payload.healed as number)),
              }
            : u,
        )
      }
      if (payload.reflected && payload.reflected > 0) {
        // Reflected damage handled implicitly via DEATH entries from simulator.
        return units
      }
      return units
    }
    case 'DEATH': {
      const unitId = entry.unitId as string
      return units.map((u) =>
        u.id === unitId ? { ...u, alive: false, currentHp: 0 } : u,
      )
    }
    case 'REBIRTH': {
      const unitId = entry.unitId as string
      const hp = entry.restoredHp as number
      return units.map((u) =>
        u.id === unitId ? { ...u, alive: true, currentHp: hp } : u,
      )
    }
    default:
      return units
  }
}

export function BattleScene({
  teamA,
  teamB,
  log,
  controls = true,
  onComplete,
}: Props) {
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
  const [floatsByUnit, setFloatsByUnit] = useState<Record<string, FloatItem[]>>({})
  const [badgesByUnit, setBadgesByUnit] = useState<Record<string, BadgeItem[]>>({})
  const [speed, setSpeed] = useState<SceneSpeed>(1)
  const [isPaused, setIsPaused] = useState(false)
  const completedRef = useRef(false)
  const itemKeyRef = useRef(0)

  const pushFloat = useCallback(
    (unitId: string, value: number | string, kind: FloatItem['kind']) => {
      itemKeyRef.current += 1
      const key = itemKeyRef.current
      setFloatsByUnit((cur) => ({
        ...cur,
        [unitId]: [...(cur[unitId] ?? []), { key, value, kind }],
      }))
      setTimeout(() => {
        setFloatsByUnit((cur) => ({
          ...cur,
          [unitId]: (cur[unitId] ?? []).filter((f) => f.key !== key),
        }))
      }, FLOAT_DURATION_MS)
    },
    [],
  )

  const pushBadge = useCallback((unitId: string, passiveKey: string) => {
    itemKeyRef.current += 1
    const key = itemKeyRef.current
    setBadgesByUnit((cur) => ({
      ...cur,
      [unitId]: [...(cur[unitId] ?? []), { key, passiveKey }],
    }))
    setTimeout(() => {
      setBadgesByUnit((cur) => ({
        ...cur,
        [unitId]: (cur[unitId] ?? []).filter((b) => b.key !== key),
      }))
    }, FLOAT_DURATION_MS)
  }, [])

  // Skip mode: collapse everything to final state
  const doSkip = useCallback(() => {
    let acc = initialUnits
    for (const entry of log) {
      acc = applyEntry(entry, acc)
    }
    setUnits(acc)
    setLogIndex(log.length)
    setFloatsByUnit({})
    setBadgesByUnit({})
    setAttackingId(null)
    if (!completedRef.current && log.length > 0) {
      completedRef.current = true
      const winner = log.find((e) => e.type === 'WIN') as
        | { side?: 'A' | 'B' }
        | undefined
      onComplete?.(winner?.side ?? null)
    }
  }, [initialUnits, log, onComplete])

  const doReplay = useCallback(() => {
    setUnits(initialUnits)
    setLogIndex(0)
    setFloatsByUnit({})
    setBadgesByUnit({})
    setAttackingId(null)
    setIsPaused(false)
    completedRef.current = false
  }, [initialUnits])

  // Reset when log changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on new log identity
  useEffect(() => {
    setUnits(initialUnits)
    setLogIndex(0)
    setFloatsByUnit({})
    setBadgesByUnit({})
    setAttackingId(null)
    setIsPaused(false)
    completedRef.current = false
  }, [initialUnits, log])

  const runAttackEntry = useCallback(
    (entry: BattleLogEntry, delay: number) => {
      setAttackingId(entry.attackerId as string)
      const hopTimer = setTimeout(() => {
        const damages = entry.damages as {
          id: string
          final: number
          dodged: boolean
        }[]
        for (const d of damages) {
          if (d.dodged) {
            pushFloat(d.id, 'DODGED', 'dodge')
          } else if (d.final > 0) {
            pushFloat(d.id, d.final, 'damage')
          }
        }
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
    },
    [pushFloat, speed],
  )

  const runPassiveEntry = useCallback(
    (entry: BattleLogEntry, delay: number) => {
      const unitId = entry.unitId as string
      const passive = entry.passive as string
      pushBadge(unitId, passive)
      const payload = (entry.payload as { healed?: number }) ?? {}
      if (payload.healed && payload.healed > 0) {
        pushFloat(unitId, payload.healed, 'heal')
      }
      setUnits((cur) => applyEntry(entry, cur))
      const t = setTimeout(() => setLogIndex((i) => i + 1), delay / 2)
      return () => clearTimeout(t)
    },
    [pushBadge, pushFloat],
  )

  const runGenericEntry = useCallback((entry: BattleLogEntry, delay: number) => {
    setUnits((cur) => applyEntry(entry, cur))
    const t = setTimeout(() => setLogIndex((i) => i + 1), delay / 2)
    return () => clearTimeout(t)
  }, [])

  // Animation loop: advance through log entries with delay
  useEffect(() => {
    if (isPaused) {
      return
    }
    if (logIndex >= log.length) {
      if (!completedRef.current && log.length > 0) {
        completedRef.current = true
        const winner = log.find((e) => e.type === 'WIN') as
          | { side?: 'A' | 'B' }
          | undefined
        onComplete?.(winner?.side ?? null)
      }
      return
    }
    const entry = log[logIndex]
    const delay = BASE_ENTRY_DELAY_MS / speed

    if (entry.type === 'ATTACK') {
      return runAttackEntry(entry, delay)
    }
    if (entry.type === 'PASSIVE') {
      return runPassiveEntry(entry, delay)
    }
    return runGenericEntry(entry, delay)
  }, [
    logIndex,
    log,
    speed,
    isPaused,
    onComplete,
    runAttackEntry,
    runPassiveEntry,
    runGenericEntry,
  ])

  const teamAUnits = units.filter((u) => u.side === 'A')
  const teamBUnits = units.filter((u) => u.side === 'B')
  const isBossOnA = teamAUnits.length === 1 && teamBUnits.length > 1
  const isBossOnB = teamBUnits.length === 1 && teamAUnits.length > 1
  const isDone = logIndex >= log.length

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 via-slate-950 to-black p-8">
        <div className="grid min-h-[280px] grid-cols-2 gap-8">
          <TeamLane
            units={teamAUnits}
            side="A"
            attackingUnitId={attackingId}
            isBoss={isBossOnA}
            floatsByUnit={floatsByUnit}
            badgesByUnit={badgesByUnit}
          />
          <TeamLane
            units={teamBUnits}
            side="B"
            attackingUnitId={attackingId}
            isBoss={isBossOnB}
            floatsByUnit={floatsByUnit}
            badgesByUnit={badgesByUnit}
          />
        </div>
        {/* Turn counter (small, bottom right) */}
        <div className="absolute right-3 bottom-2 font-mono text-[10px] text-white/30">
          log {logIndex}/{log.length}
        </div>
      </div>
      {controls && (
        <BattleControls
          speed={speed}
          onSpeedChange={setSpeed}
          onSkip={doSkip}
          onReplay={doReplay}
          isPaused={isPaused}
          onTogglePause={() => setIsPaused((p) => !p)}
          isDone={isDone}
        />
      )}
    </div>
  )
}

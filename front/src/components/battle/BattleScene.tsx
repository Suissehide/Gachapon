import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { BattleLogEntry, SimulatorUnit } from '../../api/combat.api'
import { BattleControls } from './BattleControls'
import { FloatingNumber } from './FloatingNumber'
import { PassiveBadge } from './PassiveBadge'
import type { SceneSpeed, SceneUnit } from './types'
import { UnitPortrait } from './UnitPortrait'

type Props = {
  teamA: SimulatorUnit[]
  teamB: SimulatorUnit[]
  log: BattleLogEntry[]
  controls?: boolean
  onComplete?: (winner: 'A' | 'B' | null) => void
  /** Fires whenever the current action index changes (1-based). */
  onRoundChange?: (action: number, total: number) => void
}

const BASE_ENTRY_DELAY_MS = 600
const HOP_DURATION_MS = 200
const FLOAT_DURATION_MS = 900
const TARGET_DURATION_MS = 320

type FloatItem = {
  key: number
  value: number | string
  kind: 'damage' | 'heal' | 'dodge'
}
type BadgeItem = { key: number; passiveKey: string }

function applyEntry(entry: BattleLogEntry, units: SceneUnit[]): SceneUnit[] {
  switch (entry.type) {
    case 'ATTACK': {
      const damages = entry.damages as {
        id: string
        final: number
        dodged: boolean
      }[]
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
      const payload =
        (entry.payload as { healed?: number; reflected?: number }) ?? {}
      if (payload.healed && payload.healed > 0) {
        return units.map((u) =>
          u.id === unitId
            ? {
                ...u,
                currentHp: Math.min(
                  u.maxHp,
                  u.currentHp + (payload.healed as number),
                ),
              }
            : u,
        )
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

function countActionsUpTo(
  log: BattleLogEntry[],
  indexExclusive: number,
): number {
  let r = 1
  for (let i = 0; i < indexExclusive && i < log.length; i++) {
    if (log[i].type === 'TURN_END') {
      r += 1
    }
  }
  return r
}

export function BattleScene({
  teamA,
  teamB,
  log,
  controls = true,
  onComplete,
  onRoundChange,
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
  const [targetedIds, setTargetedIds] = useState<string[]>([])
  const [floatsByUnit, setFloatsByUnit] = useState<Record<string, FloatItem[]>>(
    {},
  )
  const [badgesByUnit, setBadgesByUnit] = useState<Record<string, BadgeItem[]>>(
    {},
  )
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
    setTargetedIds([])
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
    setTargetedIds([])
    setIsPaused(false)
    completedRef.current = false
  }, [initialUnits])

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on new log identity
  useEffect(() => {
    setUnits(initialUnits)
    setLogIndex(0)
    setFloatsByUnit({})
    setBadgesByUnit({})
    setAttackingId(null)
    setTargetedIds([])
    setIsPaused(false)
    completedRef.current = false
  }, [initialUnits, log])

  const runAttackEntry = useCallback(
    (entry: BattleLogEntry, delay: number) => {
      const targetIds = (entry.targetIds as string[] | undefined) ?? []
      setAttackingId(entry.attackerId as string)
      setTargetedIds(targetIds)
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
      const targetTimer = setTimeout(() => {
        setTargetedIds([])
      }, TARGET_DURATION_MS / speed)
      const nextTimer = setTimeout(() => {
        setLogIndex((i) => i + 1)
      }, delay)
      return () => {
        clearTimeout(hopTimer)
        clearTimeout(targetTimer)
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

  const runGenericEntry = useCallback(
    (entry: BattleLogEntry, delay: number) => {
      setUnits((cur) => applyEntry(entry, cur))
      const t = setTimeout(() => setLogIndex((i) => i + 1), delay / 2)
      return () => clearTimeout(t)
    },
    [],
  )

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
  // Boss layout (oversize portrait) only applies to a lone *enemy* boss. An
  // ally team of 1 should just render small, not balloon up to fill the row.
  const isBossOnB = teamBUnits.length === 1 && teamAUnits.length > 1
  const isDone = logIndex >= log.length
  const actionCount = countActionsUpTo(log, logIndex)
  const totalActions = useMemo(
    () => Math.max(1, log.filter((e) => e.type === 'TURN_END').length),
    [log],
  )

  // Latest callback held in a ref so the action-change effect doesn't re-fire
  // every render just because the parent passed a new inline function.
  const onRoundChangeRef = useRef(onRoundChange)
  useEffect(() => {
    onRoundChangeRef.current = onRoundChange
  }, [onRoundChange])
  useEffect(() => {
    onRoundChangeRef.current?.(actionCount, totalActions)
  }, [actionCount, totalActions])

  const renderUnit = (u: SceneUnit, enlarged?: boolean) => (
    <div key={u.id} className="relative">
      <UnitPortrait
        unit={u}
        isActing={attackingId === u.id}
        isTargeted={targetedIds.includes(u.id)}
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

  const renderRow = (rowUnits: SceneUnit[], isBoss: boolean) => {
    if (isBoss && rowUnits.length === 1) {
      return (
        <div className="flex w-full items-center justify-center">
          <div className="w-[200px] sm:w-[220px]">
            {renderUnit(rowUnits[0], true)}
          </div>
        </div>
      )
    }
    return (
      <div className="flex w-full items-center justify-center gap-3 sm:gap-4">
        {rowUnits.map((u) => (
          <div key={u.id} className="w-[110px] sm:w-[140px] md:w-[150px]">
            {renderUnit(u)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="relative flex flex-col gap-4 sm:gap-6">
        {/* Enemies */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-text-light/70">
            <span className="inline-block h-2 w-2 rounded-full bg-pink-500" />
            Adversaires
          </div>
          {renderRow(teamBUnits, isBossOnB)}
        </div>

        {/* VS divider */}
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[rgba(27,23,38,0.18)] to-transparent" />
          <span className="rounded-full border border-border bg-white px-3.5 py-1 font-display text-[13px] font-bold tracking-wider text-text">
            VS
          </span>
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[rgba(27,23,38,0.18)] to-transparent" />
        </div>

        {/* Allies */}
        <div className="flex flex-col gap-2">
          {renderRow(teamAUnits, false)}
          <div className="flex items-center justify-end gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-text-light/70">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Ton équipe
          </div>
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

import { PASSIVES, type PassiveKey } from './passives'

export type AttackPattern =
  | 'BASIC'
  | 'AOE_3'
  | 'MULTI_2'
  | 'MONO_AMPLIFIED'
  | 'MONO_DOUBLE'

export type Side = 'A' | 'B'

export interface SimulatorUnit {
  /** Unique id within the battle (e.g. "A0", "A1", "B0"). Used as target reference in log. */
  id: string
  /** Display name (optional, for readability) */
  name?: string
  /** Public URL of the unit's portrait (front consumes this for animation). Null when no asset. */
  imageUrl?: string | null
  /** Card rarity (ally units only; used by the front to render the correct card frame). */
  rarity?: string | null
  /** Card variant (ally units only). */
  variant?: string | null
  /** Card set name (ally units only). */
  setName?: string | null
  /** Ally card level (ally units only). */
  level?: number | null
  hp: number
  atk: number
  def: number
  spd: number
  attackPattern: AttackPattern
  passiveKey: string | null
  palier: number
}

export interface SimulatorInput {
  teamA: SimulatorUnit[]
  teamB: SimulatorUnit[]
  seed: string
  timeoutTurns?: number
}

export interface DamageEntry {
  id: string
  raw: number
  final: number
  dodged: boolean
}

export type LogEntry =
  | { type: 'BANNER_APPLIED'; side: Side; bonusPct: number }
  | { type: 'ATTACK'; attackerId: string; targetIds: string[]; damages: DamageEntry[] }
  | { type: 'PASSIVE'; unitId: string; passive: string; payload: Record<string, number> }
  | { type: 'DEATH'; unitId: string }
  | { type: 'REBIRTH'; unitId: string; restoredHp: number }
  | { type: 'TURN_END'; turn: number }
  | { type: 'TIMEOUT' }
  | { type: 'WIN'; side: Side }

export interface SimulatorResult {
  won: Side | null
  log: LogEntry[]
  turns: number
}

// ---------------------------------------------------------------------------
// PRNG
// ---------------------------------------------------------------------------

function hashSeed(s: string): number {
  let h = 1779033703 ^ s.length
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------------------
// Internal mutable battle state
// ---------------------------------------------------------------------------

interface BattleUnit {
  id: string
  side: Side
  maxHp: number
  currentHp: number
  baseAtk: number
  effectiveAtk: number
  def: number
  spd: number
  attackPattern: AttackPattern
  passiveKey: PassiveKey | null
  passiveValuePct: number
  palier: number
  alive: boolean
  hasBeenRevived: boolean
}

function toBattleUnit(u: SimulatorUnit, side: Side): BattleUnit {
  const passiveKey =
    u.passiveKey && u.passiveKey in PASSIVES ? (u.passiveKey as PassiveKey) : null
  const passiveValuePct =
    passiveKey === null ? 0 : PASSIVES[passiveKey].compute(u.palier).valuePct
  return {
    id: u.id,
    side,
    maxHp: u.hp,
    currentHp: u.hp,
    baseAtk: u.atk,
    effectiveAtk: u.atk,
    def: u.def,
    spd: u.spd,
    attackPattern: u.attackPattern,
    passiveKey,
    passiveValuePct,
    palier: u.palier,
    alive: true,
    hasBeenRevived: false,
  }
}

function getEnemies(units: BattleUnit[], side: Side): BattleUnit[] {
  const enemySide: Side = side === 'A' ? 'B' : 'A'
  return units.filter((u) => u.side === enemySide && u.alive)
}

function isSideDead(units: BattleUnit[], side: Side): boolean {
  return units.filter((u) => u.side === side).every((u) => !u.alive)
}

// ---------------------------------------------------------------------------
// Target selection
// ---------------------------------------------------------------------------

function pickLowestHp(enemies: BattleUnit[], count: number): BattleUnit[] {
  // stable sort by currentHp ascending, then by id for determinism
  const sorted = [...enemies].sort((a, b) => {
    if (a.currentHp !== b.currentHp) {
      return a.currentHp - b.currentHp
    }
    return a.id < b.id ? -1 : 1
  })
  return sorted.slice(0, count)
}

function selectTargets(attacker: BattleUnit, enemies: BattleUnit[]): BattleUnit[] {
  if (enemies.length === 0) {
    return []
  }
  switch (attacker.attackPattern) {
    case 'BASIC':
      return pickLowestHp(enemies, 1)
    case 'AOE_3':
      return [...enemies]
    case 'MULTI_2':
      return pickLowestHp(enemies, 2)
    case 'MONO_AMPLIFIED':
      return pickLowestHp(enemies, 1)
    case 'MONO_DOUBLE':
      return pickLowestHp(enemies, 1)
  }
}

// ---------------------------------------------------------------------------
// Banner pre-application
// ---------------------------------------------------------------------------

function applyBanner(
  units: BattleUnit[],
  side: Side,
  log: LogEntry[],
): void {
  const allies = units.filter((u) => u.side === side && u.alive)
  let totalBonus = 0
  for (const u of allies) {
    if (u.passiveKey === 'BANNER') {
      totalBonus += u.passiveValuePct
    }
  }
  if (totalBonus > 0) {
    for (const u of allies) {
      u.effectiveAtk = u.baseAtk * (1 + totalBonus / 100)
    }
    log.push({ type: 'BANNER_APPLIED', side, bonusPct: totalBonus })
  }
}

// ---------------------------------------------------------------------------
// Damage computation
// ---------------------------------------------------------------------------

function computeRawDamage(
  attackerEffectiveAtk: number,
  target: BattleUnit,
  prng: () => number,
  patternMultiplier: number,
): number {
  const variance = 0.9 + 0.2 * prng()
  return attackerEffectiveAtk * patternMultiplier * (100 / (100 + target.def)) * variance
}

function patternDamageMultiplier(pattern: AttackPattern): number {
  return pattern === 'MONO_AMPLIFIED' ? 2.5 : 1
}

// ---------------------------------------------------------------------------
// Per-strike resolution (one attacker -> set of targets, one ATTACK entry)
// ---------------------------------------------------------------------------

interface StrikeContext {
  attacker: BattleUnit
  targets: BattleUnit[]
  prng: () => number
  log: LogEntry[]
  patternMultiplier: number
}

function resolveAttackOnTarget(
  attacker: BattleUnit,
  target: BattleUnit,
  prng: () => number,
  log: LogEntry[],
  patternMultiplier: number,
): DamageEntry {
  // AEGIS roll
  if (target.passiveKey === 'AEGIS') {
    const roll = prng()
    if (roll < target.passiveValuePct / 100) {
      log.push({
        type: 'PASSIVE',
        unitId: target.id,
        passive: 'AEGIS',
        payload: { pct: target.passiveValuePct },
      })
      return { id: target.id, raw: 0, final: 0, dodged: true }
    }
  }

  let raw = computeRawDamage(attacker.effectiveAtk, target, prng, patternMultiplier)

  // EXECUTION boost (attacker's passive — boosts damage when target low HP)
  if (
    attacker.passiveKey === 'EXECUTION' &&
    target.currentHp < target.maxHp * 0.3
  ) {
    raw *= 1 + attacker.passiveValuePct / 100
    log.push({
      type: 'PASSIVE',
      unitId: attacker.id,
      passive: 'EXECUTION',
      payload: { bonusPct: attacker.passiveValuePct },
    })
  }

  const final = Math.round(raw)
  target.currentHp = Math.max(0, target.currentHp - final)

  return { id: target.id, raw, final, dodged: false }
}

function applyRiposte(
  attacker: BattleUnit,
  target: BattleUnit,
  damageDealt: number,
  log: LogEntry[],
): void {
  if (target.passiveKey !== 'RIPOSTE') {
    return
  }
  if (!target.alive || target.currentHp <= 0) {
    return
  }
  if (!attacker.alive) {
    return
  }
  const reflected = Math.round((damageDealt * target.passiveValuePct) / 100)
  if (reflected <= 0) {
    return
  }
  attacker.currentHp = Math.max(0, attacker.currentHp - reflected)
  log.push({
    type: 'PASSIVE',
    unitId: target.id,
    passive: 'RIPOSTE',
    payload: { reflected },
  })
  if (attacker.currentHp <= 0) {
    finalizeDeath(attacker, log)
  }
}

function finalizeDeath(unit: BattleUnit, log: LogEntry[]): void {
  if (!unit.alive) {
    return
  }
  if (unit.passiveKey === 'REBIRTH' && !unit.hasBeenRevived) {
    const restoredHp = Math.round((unit.maxHp * unit.passiveValuePct) / 100)
    unit.currentHp = restoredHp
    unit.hasBeenRevived = true
    log.push({ type: 'REBIRTH', unitId: unit.id, restoredHp })
    return
  }
  unit.alive = false
  unit.currentHp = 0
  log.push({ type: 'DEATH', unitId: unit.id })
}

function applyVampirism(
  attacker: BattleUnit,
  totalDamage: number,
  log: LogEntry[],
): void {
  if (attacker.passiveKey !== 'VAMPIRISM' || !attacker.alive) {
    return
  }
  if (totalDamage <= 0) {
    return
  }
  const healed = Math.min(
    Math.round((totalDamage * attacker.passiveValuePct) / 100),
    attacker.maxHp - attacker.currentHp,
  )
  if (healed <= 0) {
    return
  }
  attacker.currentHp += healed
  log.push({
    type: 'PASSIVE',
    unitId: attacker.id,
    passive: 'VAMPIRISM',
    payload: { healed },
  })
}

function processRiposteOnSurvivors(
  attacker: BattleUnit,
  targets: BattleUnit[],
  damages: DamageEntry[],
  log: LogEntry[],
): void {
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]
    const dmg = damages[i]
    if (!target || !dmg) {
      continue
    }
    if (dmg.dodged || dmg.final <= 0) {
      continue
    }
    if (target.currentHp > 0) {
      applyRiposte(attacker, target, dmg.final, log)
    }
  }
}

function processDeaths(targets: BattleUnit[], log: LogEntry[]): void {
  for (const target of targets) {
    if (target.alive && target.currentHp <= 0) {
      finalizeDeath(target, log)
    }
  }
}

function performStrike(ctx: StrikeContext): void {
  const { attacker, targets, prng, log, patternMultiplier } = ctx
  const damages: DamageEntry[] = []
  const targetIds = targets.map((t) => t.id)
  let totalNonDodgedDamage = 0

  for (const target of targets) {
    const entry = resolveAttackOnTarget(attacker, target, prng, log, patternMultiplier)
    damages.push(entry)
    if (!entry.dodged) {
      totalNonDodgedDamage += entry.final
    }
  }

  log.push({ type: 'ATTACK', attackerId: attacker.id, targetIds, damages })

  processRiposteOnSurvivors(attacker, targets, damages, log)
  processDeaths(targets, log)
  applyVampirism(attacker, totalNonDodgedDamage, log)
}

// ---------------------------------------------------------------------------
// Per-turn dispatch (one unit's action — may be multiple strikes for MONO_DOUBLE)
// ---------------------------------------------------------------------------

function performUnitAction(
  attacker: BattleUnit,
  units: BattleUnit[],
  prng: () => number,
  log: LogEntry[],
): void {
  if (!attacker.alive) {
    return
  }
  const pattern = attacker.attackPattern
  const patternMultiplier = patternDamageMultiplier(pattern)
  const strikes = pattern === 'MONO_DOUBLE' ? 2 : 1
  for (let s = 0; s < strikes; s++) {
    if (!attacker.alive) {
      return
    }
    const enemies = getEnemies(units, attacker.side)
    if (enemies.length === 0) {
      return
    }
    const targets = selectTargets(attacker, enemies)
    if (targets.length === 0) {
      return
    }
    performStrike({ attacker, targets, prng, log, patternMultiplier })
  }
}

// ---------------------------------------------------------------------------
// Turn ordering
// ---------------------------------------------------------------------------

function buildTurnOrder(
  units: BattleUnit[],
  prng: () => number,
): BattleUnit[] {
  const alive = units.filter((u) => u.alive)
  // Sort descending by spd; ties broken by prng-derived random key
  const keyed = alive.map((u) => ({ unit: u, tieBreak: prng() }))
  keyed.sort((a, b) => {
    if (a.unit.spd !== b.unit.spd) {
      return b.unit.spd - a.unit.spd
    }
    return a.tieBreak - b.tieBreak
  })
  return keyed.map((k) => k.unit)
}

// ---------------------------------------------------------------------------
// Main simulator
// ---------------------------------------------------------------------------

function handleEmptyTeams(
  teamALen: number,
  teamBLen: number,
  log: LogEntry[],
): SimulatorResult | null {
  if (teamALen === 0 && teamBLen === 0) {
    return { won: null, log, turns: 0 }
  }
  if (teamALen === 0) {
    log.push({ type: 'WIN', side: 'B' })
    return { won: 'B', log, turns: 0 }
  }
  if (teamBLen === 0) {
    log.push({ type: 'WIN', side: 'A' })
    return { won: 'A', log, turns: 0 }
  }
  return null
}

function checkVictory(units: BattleUnit[]): Side | null {
  if (isSideDead(units, 'A')) {
    return 'B'
  }
  if (isSideDead(units, 'B')) {
    return 'A'
  }
  return null
}

function runRound(
  units: BattleUnit[],
  prng: () => number,
  log: LogEntry[],
  turn: number,
): Side | null {
  const order = buildTurnOrder(units, prng)
  for (const unit of order) {
    if (!unit.alive) {
      continue
    }
    performUnitAction(unit, units, prng, log)
    const winner = checkVictory(units)
    if (winner !== null) {
      log.push({ type: 'TURN_END', turn })
      log.push({ type: 'WIN', side: winner })
      return winner
    }
  }
  log.push({ type: 'TURN_END', turn })
  return null
}

export function simulateBattle(input: SimulatorInput): SimulatorResult {
  const log: LogEntry[] = []
  const timeoutTurns = input.timeoutTurns ?? 30

  const teamAUnits = input.teamA.map((u) => toBattleUnit(u, 'A'))
  const teamBUnits = input.teamB.map((u) => toBattleUnit(u, 'B'))
  const units: BattleUnit[] = [...teamAUnits, ...teamBUnits]

  const earlyResult = handleEmptyTeams(teamAUnits.length, teamBUnits.length, log)
  if (earlyResult !== null) {
    return earlyResult
  }

  const prng = mulberry32(hashSeed(input.seed))

  applyBanner(units, 'A', log)
  applyBanner(units, 'B', log)

  let turn = 0
  while (turn < timeoutTurns) {
    turn += 1
    const winner = runRound(units, prng, log, turn)
    if (winner !== null) {
      return { won: winner, log, turns: turn }
    }
  }

  log.push({ type: 'TIMEOUT' })
  return { won: null, log, turns: turn }
}

// Re-export helpers for tests / consumers that want the same PRNG
export const _internals = {
  hashSeed,
  mulberry32,
}

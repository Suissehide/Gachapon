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
  | {
      type: 'ATTACK'
      attackerId: string
      targetIds: string[]
      damages: DamageEntry[]
    }
  | {
      type: 'PASSIVE'
      unitId: string
      passive: string
      payload: Record<string, number>
    }
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
// ATB scheduling
// ---------------------------------------------------------------------------

const ACTION_THRESHOLD = 1000
const BASE_SPD_REF = 100

/**
 * Avance le temps jusqu'à la prochaine action : chaque unité vivante gagne
 * `spd * dt` de jauge, où `dt` est le temps minimal pour qu'une unité atteigne
 * ACTION_THRESHOLD. L'unité prête de plus haute jauge agit (départage PRNG),
 * puis on lui soustrait ACTION_THRESHOLD (reliquat conservé). Déterministe.
 */
function advanceToNextActor(
  units: BattleUnit[],
  prng: () => number,
): { actor: BattleUnit; dt: number } | null {
  const alive = units.filter((u) => u.alive)
  if (alive.length === 0) {
    return null
  }
  let dt = Number.POSITIVE_INFINITY
  for (const u of alive) {
    const t = (ACTION_THRESHOLD - u.gauge) / u.spd
    if (t < dt) {
      dt = t
    }
  }
  for (const u of alive) {
    u.gauge += u.spd * dt
  }
  const ready = alive
    .filter((u) => u.gauge >= ACTION_THRESHOLD - 1e-9)
    .map((u) => ({ u, tie: prng() }))
  ready.sort((a, b) => {
    if (a.u.gauge !== b.u.gauge) {
      return b.u.gauge - a.u.gauge
    }
    return a.tie - b.tie
  })
  const actor = ready[0]?.u
  if (!actor) {
    return null
  }
  actor.gauge -= ACTION_THRESHOLD
  return { actor, dt }
}

// ---------------------------------------------------------------------------
// Internal mutable battle state
// ---------------------------------------------------------------------------

/** Effet de dégâts sur la durée subi par une unité (BURN, POISON). */
interface DotEffect {
  source: 'BURN' | 'POISON'
  /** Dégâts infligés à chaque fin de tour. */
  dmgPerTurn: number
  /** Nombre de fins de tour restantes. */
  turnsLeft: number
}

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
  /** Bouclier restant (BULWARK) : absorbe les dégâts avant les PV. */
  shield: number
  /** Effets de dégâts sur la durée actifs (BURN, POISON). */
  dots: DotEffect[]
  /** Jauge d'action ATB : se remplit de `spd` par unité de temps ; agit à ACTION_THRESHOLD. */
  gauge: number
}

function toBattleUnit(u: SimulatorUnit, side: Side): BattleUnit {
  const passiveKey =
    u.passiveKey && u.passiveKey in PASSIVES
      ? (u.passiveKey as PassiveKey)
      : null
  const passiveValuePct =
    passiveKey === null ? 0 : PASSIVES[passiveKey].compute(u.palier).valuePct

  // Passifs de statistiques appliqués une fois, en début de combat.
  let maxHp = u.hp
  let atk = u.atk
  let def = u.def
  let spd = u.spd
  let shield = 0
  const mult = 1 + passiveValuePct / 100
  switch (passiveKey) {
    case 'VIGOR':
      maxHp = Math.round(maxHp * mult)
      break
    case 'HASTE':
      spd = Math.round(spd * mult)
      break
    case 'FORTIFY':
      def = Math.round(def * mult)
      break
    case 'EMPOWER':
      atk = Math.round(atk * mult)
      break
    case 'BULWARK':
      shield = Math.round(maxHp * (passiveValuePct / 100))
      break
    default:
      break
  }

  return {
    id: u.id,
    side,
    maxHp,
    currentHp: maxHp,
    baseAtk: atk,
    effectiveAtk: atk,
    def,
    spd,
    attackPattern: u.attackPattern,
    passiveKey,
    passiveValuePct,
    palier: u.palier,
    alive: true,
    hasBeenRevived: false,
    shield,
    dots: [],
    gauge: 0,
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

function pickRandom(
  enemies: BattleUnit[],
  count: number,
  prng: () => number,
): BattleUnit[] {
  // pool trié par id : résultat indépendant de l'ordre d'entrée du tableau
  const pool = [...enemies].sort((a, b) => (a.id < b.id ? -1 : 1))
  const picked: BattleUnit[] = []
  while (picked.length < count && pool.length > 0) {
    const idx = Math.floor(prng() * pool.length)
    const [unit] = pool.splice(idx, 1)
    if (unit) {
      picked.push(unit)
    }
  }
  return picked
}

function selectTargets(
  attacker: BattleUnit,
  enemies: BattleUnit[],
  prng: () => number,
): BattleUnit[] {
  if (enemies.length === 0) {
    return []
  }
  switch (attacker.attackPattern) {
    case 'BASIC':
      return pickRandom(enemies, 1, prng)
    case 'AOE_3':
      return [...enemies]
    case 'MULTI_2':
      return pickRandom(enemies, 2, prng)
    case 'MONO_AMPLIFIED':
      return pickRandom(enemies, 1, prng)
    case 'MONO_DOUBLE':
      return pickRandom(enemies, 1, prng)
  }
}

// ---------------------------------------------------------------------------
// Banner pre-application
// ---------------------------------------------------------------------------

function applyBanner(units: BattleUnit[], side: Side, log: LogEntry[]): void {
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
  targetDef: number,
  prng: () => number,
  patternMultiplier: number,
): number {
  const variance = 0.9 + 0.2 * prng()
  return (
    attackerEffectiveAtk *
    patternMultiplier *
    (100 / (100 + Math.max(0, targetDef))) *
    variance
  )
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
  /** Multiplicateur d'ATQ propre à l'action (ex. NEMESIS selon les alliés tombés). */
  attackerAtkMult: number
}

function resolveAttackOnTarget(
  attacker: BattleUnit,
  target: BattleUnit,
  prng: () => number,
  log: LogEntry[],
  patternMultiplier: number,
  attackerAtkMult: number,
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

  // PIERCE (attacker) — ignore une partie de la défense de la cible.
  let effectiveDef = target.def
  if (attacker.passiveKey === 'PIERCE') {
    effectiveDef = target.def * (1 - attacker.passiveValuePct / 100)
  }

  let raw = computeRawDamage(
    attacker.effectiveAtk * attackerAtkMult,
    effectiveDef,
    prng,
    patternMultiplier,
  )

  // FURY (attacker) — bonus de dégâts quand l'attaquant est sous 50 % de PV.
  if (
    attacker.passiveKey === 'FURY' &&
    attacker.currentHp < attacker.maxHp * 0.5
  ) {
    raw *= 1 + attacker.passiveValuePct / 100
    log.push({
      type: 'PASSIVE',
      unitId: attacker.id,
      passive: 'FURY',
      payload: { bonusPct: attacker.passiveValuePct },
    })
  }

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

  // CRIT (attacker) — chance d'infliger le double des dégâts.
  if (
    attacker.passiveKey === 'CRIT' &&
    prng() < attacker.passiveValuePct / 100
  ) {
    raw *= 2
    log.push({
      type: 'PASSIVE',
      unitId: attacker.id,
      passive: 'CRIT',
      payload: { pct: attacker.passiveValuePct },
    })
  }

  // RAMPART (target) — atténuation plate des dégâts subis.
  if (target.passiveKey === 'RAMPART') {
    raw *= 1 - target.passiveValuePct / 100
    log.push({
      type: 'PASSIVE',
      unitId: target.id,
      passive: 'RAMPART',
      payload: { reducedPct: target.passiveValuePct },
    })
  }

  let final = Math.round(raw)

  // BULWARK (target) — le bouclier absorbe les dégâts avant les PV.
  if (target.shield > 0 && final > 0) {
    const absorbed = Math.min(target.shield, final)
    target.shield -= absorbed
    final -= absorbed
    log.push({
      type: 'PASSIVE',
      unitId: target.id,
      passive: 'BULWARK',
      payload: { absorbed },
    })
  }

  target.currentHp = Math.max(0, target.currentHp - final)

  // BURN / POISON (attacker) — applique un effet de dégâts sur la durée à la cible.
  if (final > 0) {
    applyDotOnHit(attacker, target, log)
  }

  return { id: target.id, raw, final, dodged: false }
}

/**
 * Applique (ou rafraîchit) un effet de dégâts sur la durée quand l'attaquant
 * possède BURN ou POISON.
 * - BURN : dégâts par tour = % de l'ATQ de l'attaquant.
 * - POISON : dégâts par tour = % des PV max de la cible.
 * Durée fixe de 2 tours ; un nouvel effet de même source remplace le précédent.
 */
function applyDotOnHit(
  attacker: BattleUnit,
  target: BattleUnit,
  log: LogEntry[],
): void {
  let source: DotEffect['source']
  let dmgPerTurn: number
  if (attacker.passiveKey === 'BURN') {
    source = 'BURN'
    dmgPerTurn = Math.max(
      1,
      Math.round((attacker.effectiveAtk * attacker.passiveValuePct) / 100),
    )
  } else if (attacker.passiveKey === 'POISON') {
    source = 'POISON'
    dmgPerTurn = Math.max(
      1,
      Math.round((target.maxHp * attacker.passiveValuePct) / 100),
    )
  } else {
    return
  }

  const existing = target.dots.find((d) => d.source === source)
  if (existing) {
    existing.dmgPerTurn = Math.max(existing.dmgPerTurn, dmgPerTurn)
    existing.turnsLeft = 2
  } else {
    target.dots.push({ source, dmgPerTurn, turnsLeft: 2 })
  }
  log.push({
    type: 'PASSIVE',
    unitId: attacker.id,
    passive: source,
    payload: { dmgPerTurn },
  })
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
  const { attacker, targets, prng, log, patternMultiplier, attackerAtkMult } =
    ctx
  const damages: DamageEntry[] = []
  const targetIds = targets.map((t) => t.id)
  let totalNonDodgedDamage = 0

  for (const target of targets) {
    const entry = resolveAttackOnTarget(
      attacker,
      target,
      prng,
      log,
      patternMultiplier,
      attackerAtkMult,
    )
    damages.push(entry)
    if (!entry.dodged) {
      totalNonDodgedDamage += entry.final
    }
  }

  log.push({ type: 'ATTACK', attackerId: attacker.id, targetIds, damages })

  processRiposteOnSurvivors(attacker, targets, damages, log)
  processDeaths(targets, log)
  applyVampirism(attacker, totalNonDodgedDamage, log)
  applyBloodlust(attacker, targets, log)
}

/**
 * BLOODLUST — l'attaquant se soigne pour chaque ennemi éliminé par sa frappe.
 * Une cible « éliminée » est une cible ciblée par la frappe qui n'est plus en vie
 * après résolution (REBIRTH la garde en vie, donc ne déclenche pas le soin).
 */
function applyBloodlust(
  attacker: BattleUnit,
  targets: BattleUnit[],
  log: LogEntry[],
): void {
  if (attacker.passiveKey !== 'BLOODLUST' || !attacker.alive) {
    return
  }
  const kills = targets.filter((t) => !t.alive).length
  if (kills <= 0) {
    return
  }
  const perKill = Math.round((attacker.maxHp * attacker.passiveValuePct) / 100)
  const healed = Math.min(perKill * kills, attacker.maxHp - attacker.currentHp)
  if (healed <= 0) {
    return
  }
  attacker.currentHp += healed
  log.push({
    type: 'PASSIVE',
    unitId: attacker.id,
    passive: 'BLOODLUST',
    payload: { healed, kills },
  })
}

// ---------------------------------------------------------------------------
// Per-turn dispatch (one unit's action — may be multiple strikes for MONO_DOUBLE)
// ---------------------------------------------------------------------------

function computeAttackerAtkMult(
  attacker: BattleUnit,
  units: BattleUnit[],
  log: LogEntry[],
): number {
  // NEMESIS — gagne de l'ATQ pour chaque allié tombé au combat.
  if (attacker.passiveKey === 'NEMESIS') {
    const fallenAllies = units.filter(
      (u) => u.side === attacker.side && u.id !== attacker.id && !u.alive,
    ).length
    if (fallenAllies > 0) {
      const bonusPct = attacker.passiveValuePct * fallenAllies
      log.push({
        type: 'PASSIVE',
        unitId: attacker.id,
        passive: 'NEMESIS',
        payload: { bonusPct, fallenAllies },
      })
      return 1 + bonusPct / 100
    }
  }
  return 1
}

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
  const attackerAtkMult = computeAttackerAtkMult(attacker, units, log)
  const strikes = pattern === 'MONO_DOUBLE' ? 2 : 1
  for (let s = 0; s < strikes; s++) {
    if (!attacker.alive) {
      return
    }
    const enemies = getEnemies(units, attacker.side)
    if (enemies.length === 0) {
      return
    }
    const targets = selectTargets(attacker, enemies, prng)
    if (targets.length === 0) {
      return
    }
    performStrike({
      attacker,
      targets,
      prng,
      log,
      patternMultiplier,
      attackerAtkMult,
    })
  }
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

/** REGEN pour une seule unité (soin de soi). */
function applyRegenToUnit(u: BattleUnit, log: LogEntry[]): void {
  if (!u.alive || u.passiveKey !== 'REGEN' || u.currentHp >= u.maxHp) {
    return
  }
  const healed = Math.min(
    Math.round((u.maxHp * u.passiveValuePct) / 100),
    u.maxHp - u.currentHp,
  )
  if (healed <= 0) {
    return
  }
  u.currentHp += healed
  log.push({
    type: 'PASSIVE',
    unitId: u.id,
    passive: 'REGEN',
    payload: { healed },
  })
}

/** BURN / POISON pour une seule unité : dégâts, décrément des durées, mort éventuelle. */
function applyDotsToUnit(u: BattleUnit, log: LogEntry[]): void {
  if (!u.alive || u.dots.length === 0) {
    return
  }
  let total = 0
  for (const dot of u.dots) {
    total += dot.dmgPerTurn
    log.push({
      type: 'PASSIVE',
      unitId: u.id,
      passive: dot.source,
      payload: { damage: dot.dmgPerTurn },
    })
  }
  if (total > 0) {
    u.currentHp = Math.max(0, u.currentHp - total)
  }
  u.dots = u.dots
    .map((d) => ({ ...d, turnsLeft: d.turnsLeft - 1 }))
    .filter((d) => d.turnsLeft > 0)
  if (u.currentHp <= 0) {
    finalizeDeath(u, log)
  }
}

/** BLESSING : le soigneur soigne l'allié vivant le plus bas en ratio PV/PV max. */
function applyBlessingFromUnit(
  healer: BattleUnit,
  units: BattleUnit[],
  log: LogEntry[],
): void {
  if (!healer.alive || healer.passiveKey !== 'BLESSING') {
    return
  }
  const allies = units
    .filter((u) => u.side === healer.side && u.alive && u.currentHp < u.maxHp)
    .sort((a, b) => {
      const ra = a.currentHp / a.maxHp
      const rb = b.currentHp / b.maxHp
      if (ra !== rb) {
        return ra - rb
      }
      return a.id < b.id ? -1 : 1
    })
  const target = allies[0]
  if (!target) {
    return
  }
  const healed = Math.min(
    Math.round((target.maxHp * healer.passiveValuePct) / 100),
    target.maxHp - target.currentHp,
  )
  if (healed <= 0) {
    return
  }
  target.currentHp += healed
  log.push({
    type: 'PASSIVE',
    unitId: healer.id,
    passive: 'BLESSING',
    payload: { healed },
  })
}

/** SANCTUARY : la source soigne tous ses alliés vivants d'un % de PV max. */
function applySanctuaryFromUnit(
  src: BattleUnit,
  units: BattleUnit[],
  log: LogEntry[],
): void {
  if (!src.alive || src.passiveKey !== 'SANCTUARY') {
    return
  }
  for (const ally of units) {
    if (ally.side !== src.side || !ally.alive || ally.currentHp >= ally.maxHp) {
      continue
    }
    const healed = Math.min(
      Math.round((ally.maxHp * src.passiveValuePct) / 100),
      ally.maxHp - ally.currentHp,
    )
    if (healed <= 0) {
      continue
    }
    ally.currentHp += healed
    log.push({
      type: 'PASSIVE',
      unitId: src.id,
      passive: 'SANCTUARY',
      payload: { healed },
    })
  }
}

/**
 * Calcule le temps jusqu'à la prochaine action parmi les unités vivantes,
 * sans avancer les jauges. Retourne Infinity si aucune unité n'est vivante.
 */
function computeNextDt(alive: BattleUnit[]): number {
  let dt = Number.POSITIVE_INFINITY
  for (const u of alive) {
    const t = (ACTION_THRESHOLD - u.gauge) / u.spd
    if (t < dt) {
      dt = t
    }
  }
  return dt
}

/** Applique DoT, action et soins pour le tour d'une unité actrice. */
function runActorTurn(
  actor: BattleUnit,
  units: BattleUnit[],
  prng: () => number,
  log: LogEntry[],
): void {
  applyDotsToUnit(actor, log)
  if (actor.alive) {
    performUnitAction(actor, units, prng, log)
  }
  if (actor.alive) {
    applyRegenToUnit(actor, log)
    applyBlessingFromUnit(actor, units, log)
    applySanctuaryFromUnit(actor, units, log)
  }
}

export function simulateBattle(input: SimulatorInput): SimulatorResult {
  const log: LogEntry[] = []

  const teamAUnits = input.teamA.map((u) => toBattleUnit(u, 'A'))
  const teamBUnits = input.teamB.map((u) => toBattleUnit(u, 'B'))
  const units: BattleUnit[] = [...teamAUnits, ...teamBUnits]

  const earlyResult = handleEmptyTeams(
    teamAUnits.length,
    teamBUnits.length,
    log,
  )
  if (earlyResult !== null) {
    return earlyResult
  }

  const prng = mulberry32(hashSeed(input.seed))

  applyBanner(units, 'A', log)
  applyBanner(units, 'B', log)

  const timeCap = ((input.timeoutTurns ?? 60) * ACTION_THRESHOLD) / BASE_SPD_REF
  let elapsed = 0
  let actions = 0

  while (true) {
    const alive = units.filter((u) => u.alive)
    if (alive.length === 0) {
      break
    }
    // Vérifie le cap avant d'avancer le temps.
    const dt = computeNextDt(alive)
    if (elapsed + dt > timeCap) {
      log.push({ type: 'TIMEOUT' })
      return { won: null, log, turns: actions }
    }

    const next = advanceToNextActor(units, prng)
    if (next === null) {
      break
    }
    elapsed += next.dt

    runActorTurn(next.actor, units, prng, log)

    actions += 1
    log.push({ type: 'TURN_END', turn: actions })

    const winner = checkVictory(units)
    if (winner !== null) {
      log.push({ type: 'WIN', side: winner })
      return { won: winner, log, turns: actions }
    }
  }

  log.push({ type: 'TIMEOUT' })
  return { won: null, log, turns: actions }
}

// Re-export helpers for tests / consumers that want the same PRNG
export const _internals = {
  hashSeed,
  mulberry32,
  advanceToNextActor,
  ACTION_THRESHOLD,
  BASE_SPD_REF,
}

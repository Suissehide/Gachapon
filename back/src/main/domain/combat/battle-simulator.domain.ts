import { elementMultiplier, elementRelation } from './element'
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
  /** Élément (FIRE/WATER/NATURE/EARTH/LIGHT/DARK) ; null = neutre. */
  element?: string | null
  palier: number
  /**
   * Référence de mitigation de l'unité. Doit être mise à l'échelle de la même
   * façon que sa DEF, sinon l'unité devient en papier ou increvable.
   * Allié : mitigationRefFor(niveau/palier/variante). Ennemi : defMitigationRef × scale du seed.
   */
  mitigationRef: number
  /** Chance de coup critique, en points de pourcentage. */
  critRate: number
  /** Multiplicateur de coup critique, en points de pourcentage (150 = x1,5). */
  critDmg: number
  /** Part de la DEF de la cible ignorée, en points de pourcentage. */
  armorPen: number
  /** Part des dégâts infligés rendue en soin, en points de pourcentage. */
  lifesteal: number
}

export interface SimulatorInput {
  teamA: SimulatorUnit[]
  teamB: SimulatorUnit[]
  seed: string
  timeoutTurns?: number
  /** Multiplicateur de dégâts en avantage élémentaire (défaut 1.3). */
  elementAdvantageMult?: number
  /** Multiplicateur de dégâts en désavantage élémentaire (défaut 0.75). */
  elementDisadvantageMult?: number
}

interface ElementMults {
  adv: number
  dis: number
}

export interface DamageEntry {
  id: string
  raw: number
  final: number
  dodged: boolean
  /** Coup critique (armé par critRate, amplifié par critDmg). */
  crit: boolean
  /** Multiplicateur élémentaire appliqué (présent seulement si ≠ 1). */
  elementMult?: number
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
  | { type: 'HEAL'; unitId: string; amount: number }
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
/** Plafond d'empilement des passifs de charges (FORTIFY, EMPOWER). */
const MAX_STACKS = 5

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
  mitigationRef: number
  critRate: number
  critDmg: number
  armorPen: number
  lifesteal: number
  alive: boolean
  hasBeenRevived: boolean
  /** Bouclier restant (BULWARK) : absorbe les dégâts avant les PV. */
  shield: number
  /** Effets de dégâts sur la durée actifs (BURN, POISON). */
  dots: DotEffect[]
  /** Jauge d'action ATB : se remplit de `spd` par unité de temps ; agit à ACTION_THRESHOLD. */
  gauge: number
  /** Élément (string libre) ; null = neutre. */
  element: string | null
  /** Nombre d'actions déjà jouées par cette unité. Support des passifs de cadence. */
  attackCount: number
  /** Nombre de coups encaissés. Support des empilements défensifs. */
  hitsTaken: number
  /** Charges d'empilement par clé de passif. */
  stacks: Record<string, number>
}

function toBattleUnit(u: SimulatorUnit, side: Side): BattleUnit {
  const passiveKey =
    u.passiveKey && u.passiveKey in PASSIVES
      ? (u.passiveKey as PassiveKey)
      : null
  const passiveValuePct =
    passiveKey === null ? 0 : PASSIVES[passiveKey].compute(u.palier).valuePct

  const maxHp = u.hp
  // BULWARK reste le seul passif appliqué une fois, en début de combat : un
  // bouclier de départ. VIGOR, HASTE, FORTIFY et EMPOWER (tâche 10) sont
  // désormais dynamiques et n'altèrent plus les stats initiales.
  const shield =
    passiveKey === 'BULWARK' ? Math.round(maxHp * (passiveValuePct / 100)) : 0

  return {
    id: u.id,
    side,
    maxHp,
    currentHp: maxHp,
    baseAtk: u.atk,
    effectiveAtk: u.atk,
    def: u.def,
    spd: u.spd,
    attackPattern: u.attackPattern,
    passiveKey,
    passiveValuePct,
    palier: u.palier,
    mitigationRef: u.mitigationRef,
    critRate: u.critRate,
    critDmg: u.critDmg,
    armorPen: u.armorPen,
    lifesteal: u.lifesteal,
    alive: true,
    hasBeenRevived: false,
    shield,
    dots: [],
    gauge: 0,
    element: u.element ?? null,
    attackCount: 0,
    hitsTaken: 0,
    stacks: {},
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

/**
 * Restreint le pool de cibles à celles que l'attaquant bat élémentairement.
 * Focus dur : s'il existe au moins une cible en désavantage, elle est la seule
 * candidate. Sinon on rend le pool complet (tirage aléatoire habituel).
 * Un attaquant ou une cible sans élément donne une relation NEUTRAL, donc
 * aucune préférence — le comportement historique est préservé.
 */
function preferAdvantagedTargets<T extends { element: string | null }>(
  attackerElement: string | null,
  enemies: T[],
): T[] {
  const advantaged = enemies.filter(
    (e) => elementRelation(attackerElement, e.element) === 'ADVANTAGE',
  )
  return advantaged.length > 0 ? advantaged : enemies
}

function selectTargets(
  attacker: BattleUnit,
  enemies: BattleUnit[],
  prng: () => number,
): BattleUnit[] {
  if (enemies.length === 0) {
    return []
  }
  // AOE_3 frappe tout le monde : aucune sélection de cible à faire.
  if (attacker.attackPattern === 'AOE_3') {
    return [...enemies]
  }
  const preferred = preferAdvantagedTargets(attacker.element, enemies)
  switch (attacker.attackPattern) {
    case 'BASIC':
    case 'MONO_AMPLIFIED':
    case 'MONO_DOUBLE':
      return pickRandom(preferred, 1, prng)
    case 'MULTI_2': {
      const picked = pickRandom(preferred, 2, prng)
      if (picked.length >= 2) {
        return picked
      }
      // Une seule cible avantagée : on complète avec le reste du pool.
      const rest = enemies.filter((e) => !picked.includes(e))
      return [...picked, ...pickRandom(rest, 2 - picked.length, prng)]
    }
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
  targetMitigationRef: number,
  prng: () => number,
  patternMultiplier: number,
): number {
  const variance = 0.9 + 0.2 * prng()
  const k = Math.max(1, targetMitigationRef)
  return (
    attackerEffectiveAtk *
    patternMultiplier *
    (k / (k + Math.max(0, targetDef))) *
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
  /** Multiplicateurs de la roue élémentaire (avantage / désavantage). */
  elementMults: ElementMults
}

/**
 * Modificateurs de dégâts liés aux passifs, dans l'ordre : FURY et EXECUTION
 * (attaquant, conditionnés aux PV), puis RAMPART (cible, atténuation plate).
 * Chaque déclenchement est journalisé.
 *
 * CRIT n'y figure plus : sa cadence garantie est câblée directement dans
 * `resolveAttackOnTarget`, au point d'appel du tirage `critRate`.
 */
function applyPassiveDamageModifiers(
  attacker: BattleUnit,
  target: BattleUnit,
  raw: number,
  log: LogEntry[],
): number {
  let out = raw

  // FURY (attacker) — bonus de dégâts quand l'attaquant est sous 50 % de PV.
  if (
    attacker.passiveKey === 'FURY' &&
    attacker.currentHp < attacker.maxHp * 0.5
  ) {
    out *= 1 + attacker.passiveValuePct / 100
    log.push({
      type: 'PASSIVE',
      unitId: attacker.id,
      passive: 'FURY',
      payload: { bonusPct: attacker.passiveValuePct },
    })
  }

  // EXECUTION (attacker) — bonus de dégâts quand la cible est sous 30 % de PV.
  if (
    attacker.passiveKey === 'EXECUTION' &&
    target.currentHp < target.maxHp * 0.3
  ) {
    out *= 1 + attacker.passiveValuePct / 100
    log.push({
      type: 'PASSIVE',
      unitId: attacker.id,
      passive: 'EXECUTION',
      payload: { bonusPct: attacker.passiveValuePct },
    })
  }

  // RAMPART (target) — atténuation plate des dégâts subis.
  if (target.passiveKey === 'RAMPART') {
    out *= 1 - target.passiveValuePct / 100
    log.push({
      type: 'PASSIVE',
      unitId: target.id,
      passive: 'RAMPART',
      payload: { reducedPct: target.passiveValuePct },
    })
  }

  return out
}

/**
 * FORTIFY — multiplicateur de DEF composé au moment des dégâts, à partir des
 * charges accumulées par `applyFortifyStack`. Additif (+X % par charge),
 * symétrique de `resolveEmpowerMult` pour l'ATQ — ne touche jamais
 * `target.def`.
 */
function resolveFortifyMult(target: BattleUnit): number {
  const charges = target.stacks.fortify ?? 0
  if (target.passiveKey !== 'FORTIFY' || charges <= 0) {
    return 1
  }
  return 1 + (PASSIVES.FORTIFY.compute(target.palier).valuePct * charges) / 100
}

/**
 * PIERCE — le premier coup porté à chaque cible ignore toute sa DEF ; les
 * suivants retombent sur armorPen. N'est appelée qu'après le roll d'esquive
 * (AEGIS) : un coup esquivé n'est pas « porté » et ne consomme pas ce
 * premier coup.
 */
function resolveEffectiveDef(
  attacker: BattleUnit,
  target: BattleUnit,
  log: LogEntry[],
): number {
  const premierCoupPierce =
    attacker.passiveKey === 'PIERCE' && !attacker.stacks[`pierce:${target.id}`]
  if (!premierCoupPierce) {
    const armorPenPct = Math.max(0, Math.min(100, attacker.armorPen))
    return target.def * resolveFortifyMult(target) * (1 - armorPenPct / 100)
  }
  attacker.stacks[`pierce:${target.id}`] = 1
  log.push({
    type: 'PASSIVE',
    unitId: attacker.id,
    passive: 'PIERCE',
    payload: {},
  })
  return 0
}

/**
 * Critique — le tirage prng() garde sa position historique dans la séquence
 * et s'exécute systématiquement, même quand CRIT force déjà le critique par
 * cadence (une attaque sur trois) : sinon la séquence PRNG diverge selon que
 * l'unité porte le passif ou non, et le déterminisme à seed égal casse.
 */
function resolveCrit(
  attacker: BattleUnit,
  prng: () => number,
  log: LogEntry[],
): boolean {
  const cadenceCrit =
    attacker.passiveKey === 'CRIT' &&
    (attacker.attackCount + 1) % attacker.passiveValuePct === 0
  const tirageCrit = prng() < attacker.critRate / 100
  if (cadenceCrit) {
    log.push({
      type: 'PASSIVE',
      unitId: attacker.id,
      passive: 'CRIT',
      payload: {},
    })
  }
  return cadenceCrit || tirageCrit
}

/**
 * lifesteal (attaquant) — VAMPIRISM double ce lifesteal sous 50 % de PV de
 * l'attaquant ; sans lifesteal de base (stuff), le passif ne fait rien — la
 * synergie est voulue.
 */
function resolveLifesteal(attacker: BattleUnit, log: LogEntry[]): number {
  if (
    attacker.passiveKey !== 'VAMPIRISM' ||
    attacker.currentHp >= attacker.maxHp / 2 ||
    attacker.lifesteal <= 0
  ) {
    return attacker.lifesteal
  }
  log.push({
    type: 'PASSIVE',
    unitId: attacker.id,
    passive: 'VAMPIRISM',
    payload: {},
  })
  return attacker.lifesteal * 2
}

/**
 * FORTIFY — durcit à chaque coup encaissé, aligné sur `hitsTaken` (tâche 8) :
 * un coup entièrement absorbé (`final` retombé à 0, ex. DEF écrasante) n'incrémente
 * ni l'un ni l'autre — la garde `final > 0` est partagée. Les dégâts sur la
 * durée (BURN/POISON, appliqués par `applyDotsToUnit` en fin de tour) ne
 * passent pas par cette fonction non plus : un tick de poison n'est pas
 * « un coup encaissé », c'est voulu — contrairement à VIGOR (ci-dessous),
 * qui surveille un seuil de PV et se moque de la cause de la perte.
 *
 * On ne stocke que les charges, jamais `target.def` directement : comme
 * EMPOWER pour l'ATQ (voir `applyEmpowerStack`), le multiplicateur se
 * compose au moment où la DEF est utilisée, dans `resolveEffectiveDef` via
 * `resolveFortifyMult`. C'est ce qui rend l'empilement additif (+X % par
 * charge) plutôt que géométrique — conforme au texte du passif.
 */
function applyFortifyStack(
  target: BattleUnit,
  final: number,
  log: LogEntry[],
): void {
  if (
    final <= 0 ||
    target.passiveKey !== 'FORTIFY' ||
    (target.stacks.fortify ?? 0) >= MAX_STACKS
  ) {
    return
  }
  target.stacks.fortify = (target.stacks.fortify ?? 0) + 1
  log.push({
    type: 'PASSIVE',
    unitId: target.id,
    passive: 'FORTIFY',
    payload: { stacks: target.stacks.fortify },
  })
}

/**
 * VIGOR — second souffle, une seule fois par combat, au passage sous 50 % de
 * PV. Contrairement à FORTIFY, VIGOR surveille un SEUIL DE PV, pas « un coup
 * encaissé » — il doit donc se déclencher quelle que soit la cause de la
 * perte : appelée à la fois depuis `resolveAttackOnTarget` (dégâts directs)
 * et depuis `applyDotsToUnit` (BURN/POISON), avant tout `finalizeDeath` pour
 * qu'un second souffle sur un tick fatal ait une chance de sauver l'unité.
 *
 * Effet de bord voulu : un coup qui amène `currentHp` à 0 ne fait PAS mourir
 * l'unité sur le coup — `target.alive` n'est mis à `false` que par
 * `finalizeDeath`, appelé APRÈS cette fonction sur les deux chemins d'appel
 * (voir `resolveAttackOnTarget` et `applyDotsToUnit`). La garde `!target.alive`
 * ci-dessous est donc encore fausse à 0 PV : VIGOR se déclenche, soigne, et le
 * coup mortel est purement et simplement annulé — ce n'est pas une simple
 * marge de survie « de justesse », c'est une négation complète du coup fatal.
 */
function applyVigorSecondWind(target: BattleUnit, log: LogEntry[]): void {
  if (
    target.passiveKey !== 'VIGOR' ||
    target.stacks.vigor ||
    !target.alive ||
    target.currentHp >= target.maxHp / 2
  ) {
    return
  }
  target.stacks.vigor = 1
  const soin = Math.round(
    (target.maxHp * PASSIVES.VIGOR.compute(target.palier).valuePct) / 100,
  )
  target.currentHp = Math.min(target.maxHp, target.currentHp + soin)
  log.push({
    type: 'PASSIVE',
    unitId: target.id,
    passive: 'VIGOR',
    payload: { healed: soin },
  })
}

/**
 * EMPOWER — multiplicateur d'ATQ composé à `attackerAtkMult`, calculé à
 * partir des charges accumulées par `applyEmpowerStack` (runActorTurn).
 * Ne touche jamais `effectiveAtk` : voir le commentaire d'`applyEmpowerStack`.
 */
function resolveEmpowerMult(attacker: BattleUnit): number {
  const charges = attacker.stacks.empower ?? 0
  if (attacker.passiveKey !== 'EMPOWER' || charges <= 0) {
    return 1
  }
  return (
    1 + (PASSIVES.EMPOWER.compute(attacker.palier).valuePct * charges) / 100
  )
}

function resolveAttackOnTarget(
  attacker: BattleUnit,
  target: BattleUnit,
  prng: () => number,
  log: LogEntry[],
  patternMultiplier: number,
  attackerAtkMult: number,
  elementMults: ElementMults,
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
      return { id: target.id, raw: 0, final: 0, dodged: true, crit: false }
    }
  }

  // armorPen (attaquant) — remplace l'ancien cas particulier du passif PIERCE ;
  // PIERCE (tâche 9) y ajoute un premier coup à 0 DEF par cible.
  const effectiveDef = resolveEffectiveDef(attacker, target, log)

  let raw = computeRawDamage(
    attacker.effectiveAtk * attackerAtkMult * resolveEmpowerMult(attacker),
    effectiveDef,
    target.mitigationRef,
    prng,
    patternMultiplier,
  )

  const crit = resolveCrit(attacker, prng, log)
  if (crit) {
    raw *= attacker.critDmg / 100
  }

  raw = applyPassiveDamageModifiers(attacker, target, raw, log)

  // Roue élémentaire — avantage/désavantage de l'attaquant sur la cible.
  const elMult = elementMultiplier(
    attacker.element,
    target.element,
    elementMults.adv,
    elementMults.dis,
  )
  if (elMult !== 1) {
    raw *= elMult
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

  // Coup non esquivé encaissé après absorption du bouclier : ne compte que
  // s'il reste des dégâts réels. Support des empilements défensifs (FORTIFY).
  if (final > 0) {
    target.hitsTaken += 1
  }
  applyFortifyStack(target, final, log)
  applyVigorSecondWind(target, log)

  // BURN / POISON (attacker) — applique un effet de dégâts sur la durée à la cible.
  if (final > 0) {
    applyDotOnHit(attacker, target, log)
  }

  // lifesteal (attaquant) — soin sur les dégâts infligés, borné aux PV max.
  // VAMPIRISM (tâche 9) double ce lifesteal sous 50 % de PV de l'attaquant.
  const lifestealEffectif = resolveLifesteal(attacker, log)
  if (lifestealEffectif > 0 && final > 0) {
    const soin = Math.round((final * lifestealEffectif) / 100)
    const avant = attacker.currentHp
    attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + soin)
    const rendu = attacker.currentHp - avant
    if (rendu > 0) {
      log.push({ type: 'HEAL', unitId: attacker.id, amount: rendu })
    }
  }

  return {
    id: target.id,
    raw,
    final,
    dodged: false,
    crit,
    ...(elMult !== 1 ? { elementMult: elMult } : {}),
  }
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
  const {
    attacker,
    targets,
    prng,
    log,
    patternMultiplier,
    attackerAtkMult,
    elementMults,
  } = ctx
  const damages: DamageEntry[] = []
  const targetIds = targets.map((t) => t.id)

  for (const target of targets) {
    const entry = resolveAttackOnTarget(
      attacker,
      target,
      prng,
      log,
      patternMultiplier,
      attackerAtkMult,
      elementMults,
    )
    damages.push(entry)
  }

  log.push({ type: 'ATTACK', attackerId: attacker.id, targetIds, damages })

  processRiposteOnSurvivors(attacker, targets, damages, log)
  processDeaths(targets, log)
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
  elementMults: ElementMults,
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
      elementMults,
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

/**
 * BURN / POISON pour une seule unité : dégâts, décrément des durées, mort
 * éventuelle. VIGOR est consulté ici aussi (pas seulement au fil de l'épée
 * dans `resolveAttackOnTarget`) : un porteur empoisonné qui n'est plus
 * attaqué directement doit quand même bénéficier de son second souffle.
 * Appelé AVANT `finalizeDeath` : un second souffle qui arrive après la mort
 * ne sert à rien.
 */
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
  applyVigorSecondWind(u, log)
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

/**
 * EMPOWER — montée en puissance offensive.
 *
 * ATTENTION : ne PAS écrire `actor.effectiveAtk = actor.baseAtk * (...)`.
 * `applyBanner` fait déjà exactement cette écriture pour le bonus de
 * BANNER ; la refaire ici écraserait ce bonus pour toute équipe qui porte
 * un porte-bannière, dès la première attaque du porteur d'EMPOWER. On ne
 * stocke donc que les charges ; le multiplicateur s'applique au moment des
 * dégâts, dans `resolveAttackOnTarget`, sans jamais toucher `effectiveAtk`.
 */
function applyEmpowerStack(actor: BattleUnit, log: LogEntry[]): void {
  if (
    actor.passiveKey !== 'EMPOWER' ||
    (actor.stacks.empower ?? 0) >= MAX_STACKS
  ) {
    return
  }
  actor.stacks.empower = (actor.stacks.empower ?? 0) + 1
  log.push({
    type: 'PASSIVE',
    unitId: actor.id,
    passive: 'EMPOWER',
    payload: { stacks: actor.stacks.empower },
  })
}

/**
 * HASTE — tour bonus par cadence : toutes les `cadence` actions, la jauge
 * est remise directement au seuil ATB, ce qui fait rejouer l'unité au
 * prochain passage de `advanceToNextActor` sans consommer de temps
 * supplémentaire. Aucun tirage PRNG : le déterminisme à seed égal tient.
 */
function applyHasteBonusTurn(actor: BattleUnit, log: LogEntry[]): void {
  if (actor.passiveKey !== 'HASTE') {
    return
  }
  const cadence = PASSIVES.HASTE.compute(actor.palier).valuePct
  if (actor.attackCount % cadence === 0) {
    actor.gauge = ACTION_THRESHOLD
    log.push({
      type: 'PASSIVE',
      unitId: actor.id,
      passive: 'HASTE',
      payload: {},
    })
  }
}

/** Applique DoT, action et soins pour le tour d'une unité actrice. */
function runActorTurn(
  actor: BattleUnit,
  units: BattleUnit[],
  prng: () => number,
  log: LogEntry[],
  elementMults: ElementMults,
): void {
  applyDotsToUnit(actor, log)
  if (actor.alive) {
    performUnitAction(actor, units, prng, log, elementMults)
    // Compteur de cadence : incrémenté après l'action, jamais avant — les
    // passifs de cadence (tâche 9) se basent sur (attackCount + 1) % N.
    actor.attackCount += 1
    applyEmpowerStack(actor, log)
    applyHasteBonusTurn(actor, log)
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

  const elementMults: ElementMults = {
    adv: input.elementAdvantageMult ?? 1.3,
    dis: input.elementDisadvantageMult ?? 0.75,
  }

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

    runActorTurn(next.actor, units, prng, log, elementMults)

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
  preferAdvantagedTargets,
  ACTION_THRESHOLD,
  BASE_SPD_REF,
}

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
      /**
       * Unité qui subit `payload.damage` quand ce n'est pas `unitId`
       * (RIPOSTE : le porteur renvoie, l'attaquant encaisse).
       */
      targetId?: string
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
/**
 * Part des dégâts réellement subie par un porteur de TAUNT (coups qu'il a
 * attirés) et de GUARDIAN (part détournée). Sans atténuation, déplacer les
 * dégâts sur une seule carte affaiblit l'équipe (mesuré : -7 % et -5 %) ;
 * valeurs calibrées au banc d'essai (scripts/passive-bench.ts). Les textes
 * de passives.definitions.ts et du front les citent : les garder alignés.
 */
const TAUNT_DAMAGE_MULT = 0.45
const GUARDIAN_DAMAGE_MULT = 0.2
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
    // Jauge au-delà du seuil (surplus de MOMENTUM) : prête tout de suite.
    const t = Math.max(0, ACTION_THRESHOLD - u.gauge) / u.spd
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

/** Baisse temporaire d'une stat (WEAKEN : ATQ, SUNDER : DEF). */
interface Debuff {
  pct: number
  /** Actions restantes de l'unité affaiblie. */
  turnsLeft: number
}

/** Durée de WEAKEN et SUNDER, en actions de la cible. */
const DEBUFF_TURNS = 2

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
  /** Marque de NEMESIS : 1 = a frappé un ennemi, 2 = en a abattu un. */
  vengeanceMark: 0 | 1 | 2
  /** Camp dont un porteur de HUNT a marqué cette unité ; null = non marquée. */
  huntedBy: Side | null
  /** Le coup en cours a été attiré par TAUNT : dégâts réduits, voir resolveAttackOnTarget. */
  taunted: boolean
  /** STUN : saute sa prochaine action. */
  stunned: boolean
  /** Vient de sauter une action : insensible à STUN jusqu'à sa prochaine action jouée. */
  stunImmune: boolean
  weaken: Debuff | null
  sunder: Debuff | null
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
    vengeanceMark: 0,
    huntedBy: null,
    taunted: false,
    stunned: false,
    stunImmune: false,
    weaken: null,
    sunder: null,
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

/**
 * Cible imposée avant tout tirage habituel, ou null :
 * - TAUNT (camp visé) : X % de chance de viser un porteur ;
 * - HUNT (camp de l'attaquant) : sinon, X % de chance de viser l'ennemi marqué.
 * Les tirages prng() n'ont lieu que si un porteur existe : sans ces passifs,
 * la séquence PRNG est inchangée.
 */
function forcedTarget(
  attacker: BattleUnit,
  enemies: BattleUnit[],
  units: BattleUnit[],
  prng: () => number,
  log: LogEntry[],
): BattleUnit | null {
  const taunters = enemies.filter((e) => e.passiveKey === 'TAUNT')
  if (taunters.length > 0) {
    const pct = Math.max(...taunters.map((t) => t.passiveValuePct))
    if (prng() < pct / 100) {
      const taunter = pickRandom(taunters, 1, prng)[0] ?? null
      if (taunter) {
        taunter.taunted = true
        log.push({
          type: 'PASSIVE',
          unitId: taunter.id,
          passive: 'TAUNT',
          payload: {},
        })
      }
      return taunter
    }
  }
  const marked = enemies.find((e) => e.huntedBy === attacker.side)
  const hunters = units.filter(
    (u) => u.side === attacker.side && u.alive && u.passiveKey === 'HUNT',
  )
  if (marked && hunters.length > 0) {
    const pct = Math.max(...hunters.map((h) => h.passiveValuePct))
    if (prng() < pct / 100) {
      log.push({
        type: 'PASSIVE',
        unitId: attacker.id,
        passive: 'HUNT',
        payload: {},
      })
      return marked
    }
  }
  return null
}

function selectTargets(
  attacker: BattleUnit,
  enemies: BattleUnit[],
  units: BattleUnit[],
  prng: () => number,
  log: LogEntry[],
): BattleUnit[] {
  if (enemies.length === 0) {
    return []
  }
  // AOE_3 frappe tout le monde : aucune sélection de cible à faire.
  if (attacker.attackPattern === 'AOE_3') {
    return [...enemies]
  }
  const forced = forcedTarget(attacker, enemies, units, prng, log)
  const pool = forced ? enemies.filter((e) => e !== forced) : enemies
  const preferred = preferAdvantagedTargets(attacker.element, pool)
  switch (attacker.attackPattern) {
    case 'BASIC':
    case 'MONO_AMPLIFIED':
    case 'MONO_DOUBLE':
      return forced ? [forced] : pickRandom(preferred, 1, prng)
    case 'MULTI_2': {
      const wanted = forced ? 1 : 2
      const picked = pickRandom(preferred, wanted, prng)
      if (picked.length < wanted) {
        // Pas assez de cibles avantagées : on complète avec le reste du pool.
        const rest = pool.filter((e) => !picked.includes(e))
        picked.push(...pickRandom(rest, wanted - picked.length, prng))
      }
      return forced ? [forced, ...picked] : picked
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
  units: BattleUnit[]
  targets: BattleUnit[]
  prng: () => number
  log: LogEntry[]
  patternMultiplier: number
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

  // EXECUTION (attacker) — bonus proportionnel aux PV manquants de la cible :
  // plein à 0 PV, moitié à 50 %. Pas de seuil : un bonus réservé aux cibles
  // presque mortes tombait sur des coups qui tuaient déjà.
  if (attacker.passiveKey === 'EXECUTION' && target.currentHp < target.maxHp) {
    const bonusPct =
      attacker.passiveValuePct * (1 - target.currentHp / target.maxHp)
    out *= 1 + bonusPct / 100
    log.push({
      type: 'PASSIVE',
      unitId: attacker.id,
      passive: 'EXECUTION',
      payload: { bonusPct: Math.round(bonusPct) },
    })
  }

  // NEMESIS (attacker) — bonus contre une cible qui a frappé son équipe,
  // doublé si elle y a abattu quelqu'un (marque posée par la cible elle-même).
  if (attacker.passiveKey === 'NEMESIS' && target.vengeanceMark > 0) {
    const bonusPct = attacker.passiveValuePct * target.vengeanceMark
    out *= 1 + bonusPct / 100
    log.push({
      type: 'PASSIVE',
      unitId: attacker.id,
      passive: 'NEMESIS',
      payload: { bonusPct, mark: target.vengeanceMark },
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

function resolveEffectiveDef(attacker: BattleUnit, target: BattleUnit): number {
  const armorPenPct = Math.max(0, Math.min(100, attacker.armorPen))
  const sunderPct = target.sunder?.pct ?? 0
  return (
    target.def *
    resolveFortifyMult(target) *
    (1 - sunderPct / 100) *
    (1 - armorPenPct / 100)
  )
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
 * GUARDIAN — le premier allié vivant de la cible portant le passif (hors la
 * cible elle-même) détourne X % des dégâts du coup et n'en subit qu'une
 * part (GUARDIAN_DAMAGE_MULT) : son bouclier d'abord, puis ses PV. Renvoie la part détournée, à retirer des dégâts de la cible.
 * Journalisé avec `damage` pour que le replay retire ces PV au gardien.
 */
function applyGuardian(
  target: BattleUnit,
  units: BattleUnit[],
  final: number,
  log: LogEntry[],
): number {
  if (final <= 0) {
    return 0
  }
  const guardian = units.find(
    (u) =>
      u.side === target.side &&
      u.alive &&
      u.id !== target.id &&
      u.passiveKey === 'GUARDIAN',
  )
  if (!guardian) {
    return 0
  }
  const taken = Math.round((final * guardian.passiveValuePct) / 100)
  if (taken <= 0) {
    return 0
  }
  const subi = Math.round(taken * GUARDIAN_DAMAGE_MULT)
  const absorbed = Math.min(guardian.shield, subi)
  guardian.shield -= absorbed
  guardian.currentHp = Math.max(0, guardian.currentHp - (subi - absorbed))
  log.push({
    type: 'PASSIVE',
    unitId: guardian.id,
    passive: 'GUARDIAN',
    payload: { damage: subi - absorbed },
  })
  if (guardian.currentHp <= 0) {
    finalizeDeath(guardian, log)
  }
  return taken
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
 * EMPOWER — multiplicateur d'ATQ composé à `effectiveAtk`, calculé à
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

/** ATQ du coup : EMPOWER (charges) et WEAKEN (affaiblissement subi). */
function resolveAttackerAtk(attacker: BattleUnit): number {
  const weakenPct = attacker.weaken?.pct ?? 0
  return (
    attacker.effectiveAtk * resolveEmpowerMult(attacker) * (1 - weakenPct / 100)
  )
}

function resolveAttackOnTarget(
  attacker: BattleUnit,
  target: BattleUnit,
  units: BattleUnit[],
  prng: () => number,
  log: LogEntry[],
  patternMultiplier: number,
  elementMults: ElementMults,
): DamageEntry {
  // TAUNT — lu et remis à zéro avant l'esquive, pour ne jamais fuir sur un
  // coup suivant non attiré.
  const attire = target.taunted
  target.taunted = false

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

  const effectiveDef = resolveEffectiveDef(attacker, target)

  let raw = computeRawDamage(
    resolveAttackerAtk(attacker),
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
  if (attire) {
    raw *= TAUNT_DAMAGE_MULT
  }

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

  // GUARDIAN (allié de la cible) — encaisse une part des dégâts à sa place.
  final -= applyGuardian(target, units, final, log)

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
    attacker.vengeanceMark = Math.max(attacker.vengeanceMark, 1) as 1 | 2
  }
  applyFortifyStack(target, final, log)
  applyVigorSecondWind(target, log)

  // BURN / POISON (attacker) — applique un effet de dégâts sur la durée à la cible.
  if (final > 0) {
    applyDotOnHit(attacker, target, log)
    applyHamper(attacker, target, log)
    applyControlOnHit(attacker, target, prng, log)
  }

  // lifesteal (attaquant) — soin sur les dégâts infligés, borné aux PV max.
  if (attacker.lifesteal > 0 && final > 0) {
    const soin = Math.round((final * attacker.lifesteal) / 100)
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
    payload: { damage: reflected },
    targetId: attacker.id,
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

function processDeaths(
  attacker: BattleUnit,
  targets: BattleUnit[],
  log: LogEntry[],
): void {
  for (const target of targets) {
    if (target.alive && target.currentHp <= 0) {
      // Marque de sang (NEMESIS) : le coup était fatal, même si REBIRTH relève la cible.
      attacker.vengeanceMark = 2
      finalizeDeath(target, log)
    }
  }
}

function performStrike(ctx: StrikeContext): void {
  const {
    attacker,
    units,
    targets,
    prng,
    log,
    patternMultiplier,
    elementMults,
  } = ctx
  const damages: DamageEntry[] = []
  const targetIds = targets.map((t) => t.id)

  for (const target of targets) {
    const entry = resolveAttackOnTarget(
      attacker,
      target,
      units,
      prng,
      log,
      patternMultiplier,
      elementMults,
    )
    damages.push(entry)
  }

  log.push({ type: 'ATTACK', attackerId: attacker.id, targetIds, damages })

  processRiposteOnSurvivors(attacker, targets, damages, log)
  processDeaths(attacker, targets, log)
  applyHuntMark(attacker, targets, damages, units, log)
}

/**
 * HUNT — sans ennemi marqué vivant, le porteur marque la première cible
 * survivante qu'il vient de toucher (voir forcedTarget pour l'effet).
 */
function applyHuntMark(
  attacker: BattleUnit,
  targets: BattleUnit[],
  damages: DamageEntry[],
  units: BattleUnit[],
  log: LogEntry[],
): void {
  if (attacker.passiveKey !== 'HUNT' || !attacker.alive) {
    return
  }
  const dejaMarque = units.some(
    (u) => u.alive && u.side !== attacker.side && u.huntedBy === attacker.side,
  )
  if (dejaMarque) {
    return
  }
  const cible = targets.find((t, i) => t.alive && !damages[i]?.dodged)
  if (!cible) {
    return
  }
  cible.huntedBy = attacker.side
  log.push({
    type: 'PASSIVE',
    unitId: attacker.id,
    passive: 'HUNT',
    payload: { marked: 1 },
  })
}

/**
 * HAMPER — un coup qui inflige des dégâts repousse la jauge d'action de la
 * cible d'une part du seuil, sans descendre sous zéro.
 */
function applyHamper(
  attacker: BattleUnit,
  target: BattleUnit,
  log: LogEntry[],
): void {
  if (attacker.passiveKey !== 'HAMPER' || !target.alive) {
    return
  }
  const pushed = Math.min(
    target.gauge,
    (ACTION_THRESHOLD * attacker.passiveValuePct) / 100,
  )
  if (pushed <= 0) {
    return
  }
  target.gauge -= pushed
  log.push({
    type: 'PASSIVE',
    unitId: attacker.id,
    passive: 'HAMPER',
    payload: { pushedPct: attacker.passiveValuePct },
  })
}

/**
 * Contrôle sur un coup qui inflige des dégâts :
 * - STUN : X % de chance que la cible saute sa prochaine action (tirage
 *   prng() seulement pour un porteur, et jamais sur une cible insensible) ;
 * - WEAKEN / SUNDER : -X % d'ATQ / de DEF pendant DEBUFF_TURNS actions de la
 *   cible, durée renouvelée à chaque coup.
 */
function applyControlOnHit(
  attacker: BattleUnit,
  target: BattleUnit,
  prng: () => number,
  log: LogEntry[],
): void {
  if (!target.alive) {
    return
  }
  const pct = attacker.passiveValuePct
  switch (attacker.passiveKey) {
    case 'STUN':
      if (target.stunned || target.stunImmune || prng() >= pct / 100) {
        return
      }
      target.stunned = true
      break
    case 'WEAKEN':
      target.weaken = { pct, turnsLeft: DEBUFF_TURNS }
      break
    case 'SUNDER':
      target.sunder = { pct, turnsLeft: DEBUFF_TURNS }
      break
    default:
      return
  }
  log.push({
    type: 'PASSIVE',
    unitId: attacker.id,
    passive: attacker.passiveKey,
    payload: { pct },
  })
}

/** Décompte d'une action pour WEAKEN / SUNDER, en fin de tour de l'unité. */
function tickDebuffs(u: BattleUnit): void {
  for (const key of ['weaken', 'sunder'] as const) {
    const debuff = u[key]
    if (debuff) {
      debuff.turnsLeft -= 1
      if (debuff.turnsLeft <= 0) {
        u[key] = null
      }
    }
  }
}

/**
 * MOMENTUM — après l'action du porteur, l'allié vivant (hors porteur) dont la
 * jauge est la plus basse avance d'une part du seuil. Le journal ne nomme pas
 * l'allié : les payloads sont numériques.
 */
function applyMomentum(
  actor: BattleUnit,
  units: BattleUnit[],
  log: LogEntry[],
): void {
  if (actor.passiveKey !== 'MOMENTUM') {
    return
  }
  const allies = units.filter(
    (u) => u.side === actor.side && u.alive && u.id !== actor.id,
  )
  const target = allies.reduce<BattleUnit | null>(
    (lowest, u) => (lowest === null || u.gauge < lowest.gauge ? u : lowest),
    null,
  )
  if (!target) {
    return
  }
  // Pas de plafond : le surplus au-delà du seuil reste acquis, puisque
  // advanceToNextActor retire le seuil après l'action au lieu de remettre à 0.
  target.gauge += (ACTION_THRESHOLD * actor.passiveValuePct) / 100
  log.push({
    type: 'PASSIVE',
    unitId: actor.id,
    passive: 'MOMENTUM',
    payload: { advancedPct: actor.passiveValuePct },
  })
}

// ---------------------------------------------------------------------------
// Per-turn dispatch (one unit's action — may be multiple strikes for MONO_DOUBLE)
// ---------------------------------------------------------------------------

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
  const strikes = pattern === 'MONO_DOUBLE' ? 2 : 1
  for (let s = 0; s < strikes; s++) {
    if (!attacker.alive) {
      return
    }
    const enemies = getEnemies(units, attacker.side)
    if (enemies.length === 0) {
      return
    }
    const targets = selectTargets(attacker, enemies, units, prng, log)
    if (targets.length === 0) {
      return
    }
    performStrike({
      attacker,
      units,
      targets,
      prng,
      log,
      patternMultiplier,
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
    // Jauge au-delà du seuil (surplus de MOMENTUM) : prête tout de suite.
    const t = Math.max(0, ACTION_THRESHOLD - u.gauge) / u.spd
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
    actor.gauge = Math.max(actor.gauge, ACTION_THRESHOLD)
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
  if (actor.alive && actor.stunned) {
    // STUN — l'action est perdue ; insensible jusqu'à la prochaine jouée.
    actor.stunned = false
    actor.stunImmune = true
    log.push({
      type: 'PASSIVE',
      unitId: actor.id,
      passive: 'STUN',
      payload: { skipped: 1 },
    })
  } else if (actor.alive) {
    actor.stunImmune = false
    performUnitAction(actor, units, prng, log, elementMults)
    // Compteur de cadence : incrémenté après l'action, jamais avant — les
    // passifs de cadence (tâche 9) se basent sur (attackCount + 1) % N.
    actor.attackCount += 1
    applyEmpowerStack(actor, log)
    applyHasteBonusTurn(actor, log)
    applyMomentum(actor, units, log)
  }
  if (actor.alive) {
    applyRegenToUnit(actor, log)
    applyBlessingFromUnit(actor, units, log)
    applySanctuaryFromUnit(actor, units, log)
  }
  tickDebuffs(actor)
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

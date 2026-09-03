import type { EconomyConfig } from '../api/economy.api'
import type {
  EquipmentSetDefinition,
  EquipmentSetKey,
} from '../api/equipment.api'
import type { CardRarity, CardVariant } from '../constants/card.constant'

const VARIANT_MULT: Record<CardVariant, number> = {
  NORMAL: 1.0,
  BRILLIANT: 1.15,
  HOLOGRAPHIC: 1.3,
}

const STAT_GROWTH_PER_LEVEL = 0.06
const ASCENSION_STAT_BONUS = 0.15
// Référence de vitesse pour la puissance : une unité à SPD_REF a un multiplicateur
// de vitesse neutre (×1). Au-dessus, elle agit plus souvent (ATB) → puissance
// plus élevée ; en dessous, plus faible. Doit rester alignée avec le backend
// (campaign-power.ts).
const SPD_REF = 100

export function statAtLevel(baseStat: number, level: number): number {
  return baseStat * (1 + STAT_GROWTH_PER_LEVEL * (level - 1))
}

export function palierMultiplier(palier: number): number {
  return (1 + ASCENSION_STAT_BONUS) ** (palier - 1)
}

export function finalStat(
  baseStat: number,
  level: number,
  variant: CardVariant,
  palier: number,
): number {
  return (
    statAtLevel(baseStat, level) *
    VARIANT_MULT[variant] *
    palierMultiplier(palier)
  )
}

/**
 * Puissance agrégée d'une carte, à partir de ses stats finales. Sous ATB la
 * vitesse multiplie le rendement (une unité 2× plus rapide agit ~2× plus
 * souvent), donc elle pondère l'ensemble au lieu d'être un simple terme additif.
 * Formule partagée (grille collection, popup, team editor, campagne, mobs).
 */
export function computePower(stats: {
  hp: number
  atk: number
  def: number
  spd: number
}): number {
  return Math.round(
    (stats.hp / 2 + stats.atk * 1.5 + stats.def) * (stats.spd / SPD_REF),
  )
}

export type StatKey = 'hp' | 'atk' | 'def' | 'spd'
export type StatBonus = { flat: number; pct: number }
export type StatBonuses = Record<StatKey, StatBonus>

const STAT_KEYS: StatKey[] = ['hp', 'atk', 'def', 'spd']

export function emptyStatBonuses(): StatBonuses {
  return {
    hp: { flat: 0, pct: 0 },
    atk: { flat: 0, pct: 0 },
    def: { flat: 0, pct: 0 },
    spd: { flat: 0, pct: 0 },
  }
}

// Parse a backend bonus key (`hpFlat`, `atkPct`, …) into its stat + kind, or
// null if it isn't a recognized stat bonus.
function parseBonusKey(
  key: string,
): { stat: StatKey; kind: 'flat' | 'pct' } | null {
  const kind = key.endsWith('Pct')
    ? 'pct'
    : key.endsWith('Flat')
      ? 'flat'
      : null
  if (!kind) {
    return null
  }
  const stat = key.slice(0, kind === 'pct' ? -3 : -4) as StatKey
  return STAT_KEYS.includes(stat) ? { stat, kind } : null
}

// Accumulate equipment item bonuses into the aggregated stats.
function accumulateItemBonuses(
  acc: StatBonuses,
  item: {
    bonuses: Record<string, number>
    level: number
    substats: { key: string; value: number }[]
    baseBoost: number
  },
  equipLevelScale: number,
): void {
  const mult = 1 + equipLevelScale * (item.level - 1)
  for (const [key, value] of Object.entries(item.bonuses)) {
    const parsed = parseBonusKey(key)
    if (parsed) {
      acc[parsed.stat][parsed.kind] += value * mult
    }
  }
  const baseKey = Object.keys(item.bonuses)[0]
  if (baseKey !== undefined && item.baseBoost !== 0) {
    const parsed = parseBonusKey(baseKey)
    if (parsed) {
      acc[parsed.stat][parsed.kind] += item.baseBoost
    }
  }
  for (const s of item.substats) {
    const parsed = parseBonusKey(s.key)
    if (parsed) {
      acc[parsed.stat][parsed.kind] += s.value
    }
  }
}

/**
 * Aggregate the flat/percent bonuses of every equipment piece equipped on a
 * given card: catalog base scaled by instance level (baseBoost added on the
 * first key — the item's base bonus), plus substats. Mirrors
 * `effectiveEquipmentBonuses` + `computeFinalStats` in the backend.
 */
export function aggregateEquipmentBonuses(
  items: {
    equippedOnId: string | null
    bonuses: Record<string, number>
    level: number
    substats: { key: string; value: number }[]
    baseBoost: number
  }[],
  userCardId: string,
  equipLevelScale: number,
): StatBonuses {
  const acc = emptyStatBonuses()
  for (const item of items) {
    if (item.equippedOnId !== userCardId) {
      continue
    }
    accumulateItemBonuses(acc, item, equipLevelScale)
  }
  return acc
}

// --- Stats de stuff : critRate, critDmg, armorPen, lifesteal ---
// Contrairement à PV/ATQ/DEF/VIT, elles ne sont jamais mises à l'échelle par
// le niveau/palier de la carte : une baseline commune (config, jamais
// recopiée en dur) + des points de pourcentage additifs venant de
// l'équipement et des sets. Miroir de `computeFinalStats` côté back.

export type StuffStatKey = 'critRate' | 'critDmg' | 'armorPen' | 'lifesteal'
export type StuffStatBonuses = Record<StuffStatKey, number>

const STUFF_STAT_KEYS: StuffStatKey[] = [
  'critRate',
  'critDmg',
  'armorPen',
  'lifesteal',
]

export function emptyStuffStatBonuses(): StuffStatBonuses {
  return { critRate: 0, critDmg: 0, armorPen: 0, lifesteal: 0 }
}

function parseStuffBonusKey(key: string): StuffStatKey | null {
  return STUFF_STAT_KEYS.find((stat) => key === `${stat}Pct`) ?? null
}

function accumulateItemStuffBonuses(
  acc: StuffStatBonuses,
  item: {
    bonuses: Record<string, number>
    level: number
    substats: { key: string; value: number }[]
    baseBoost: number
  },
  equipLevelScale: number,
): void {
  const mult = 1 + equipLevelScale * (item.level - 1)
  for (const [key, value] of Object.entries(item.bonuses)) {
    const stat = parseStuffBonusKey(key)
    if (stat) {
      acc[stat] += value * mult
    }
  }
  const baseKey = Object.keys(item.bonuses)[0]
  if (baseKey !== undefined && item.baseBoost !== 0) {
    const stat = parseStuffBonusKey(baseKey)
    if (stat) {
      acc[stat] += item.baseBoost
    }
  }
  for (const s of item.substats) {
    const stat = parseStuffBonusKey(s.key)
    if (stat) {
      acc[stat] += s.value
    }
  }
}

function addBonusRecord(
  total: Record<string, number>,
  bonuses: Record<string, number>,
): void {
  for (const [k, v] of Object.entries(bonuses)) {
    total[k] = (total[k] ?? 0) + v
  }
}

/**
 * Bonus de set agrégés pour une carte, à partir des clés de set des pièces
 * qu'elle porte. Miroir de `computeSetBonuses` (backend) : comptage PAR
 * CARTE, palier 2 puis palier 4 — deux cartes qui portent chacune 2 pièces
 * d'un même set ont chacune leur palier 2, elles ne cumulent pas à 4.
 * `setDefs` vient de `useEquipmentSets()` : jamais de valeur recopiée ici.
 */
export function computeCardSetBonuses(
  setKeys: readonly string[],
  setDefs: EquipmentSetDefinition[],
): Record<string, number> {
  const counts = new Map<string, number>()
  for (const key of setKeys) {
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const byKey = new Map(setDefs.map((d) => [d.key, d]))
  const total: Record<string, number> = {}
  for (const [key, n] of counts) {
    const def = byKey.get(key as EquipmentSetKey)
    // Un seul seuil par set, et rien au-delà : porter 4 pièces d'un set de 2
    // ne donne pas plus que 2.
    if (def && n >= def.pieces) {
      addBonusRecord(total, def.bonus.bonuses)
    }
  }
  return total
}

/**
 * Stats de stuff finales d'une carte : baseline (issue de `/economy/config`)
 * + bonus d'équipement (catalogue + substats) + bonus de set. `critRate` est
 * capé à 100, comme côté back.
 */
export function cardStuffStats(
  items: {
    equippedOnId: string | null
    setKey: string
    bonuses: Record<string, number>
    level: number
    substats: { key: string; value: number }[]
    baseBoost: number
  }[],
  userCardId: string,
  equipLevelScale: number,
  setDefs: EquipmentSetDefinition[],
  baseline: StuffStatBonuses,
): StuffStatBonuses {
  const equippedHere = items.filter((i) => i.equippedOnId === userCardId)
  const acc = emptyStuffStatBonuses()
  for (const item of equippedHere) {
    accumulateItemStuffBonuses(acc, item, equipLevelScale)
  }
  const setBonuses = computeCardSetBonuses(
    equippedHere.map((i) => i.setKey),
    setDefs,
  )
  for (const [key, value] of Object.entries(setBonuses)) {
    const stat = parseStuffBonusKey(key)
    if (stat) {
      acc[stat] += value
    }
  }
  return {
    critRate: Math.min(100, baseline.critRate + acc.critRate),
    critDmg: baseline.critDmg + acc.critDmg,
    armorPen: baseline.armorPen + acc.armorPen,
    lifesteal: baseline.lifesteal + acc.lifesteal,
  }
}

/**
 * Sets actifs portés par une carte : pour chaque set représenté, le compte
 * de pièces et le palier atteint (0, 2 ou 4). Consommée par la fiche de
 * carte pour l'arbitrage — voir `EquipmentSlotsPanel`.
 */
export type ActiveSetSummary = {
  key: string
  label: string
  count: number
  /** Pièces exigées par le set (2, 3 ou 4). */
  pieces: number
  active: boolean
}

export function activeSetsForCard(
  setKeys: readonly string[],
  setDefs: EquipmentSetDefinition[],
): ActiveSetSummary[] {
  const counts = new Map<string, number>()
  for (const key of setKeys) {
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const byKey = new Map(setDefs.map((d) => [d.key, d]))
  return [...counts.entries()]
    .map(([key, count]) => {
      const def = byKey.get(key as EquipmentSetKey)
      // Sans définition (set inconnu du front), on affiche le compte sans
      // prétendre savoir s'il est actif.
      const pieces = def?.pieces ?? 0
      return {
        key,
        label: def?.label ?? key,
        count,
        pieces,
        active: pieces > 0 && count >= pieces,
      }
    })
    .sort((a, b) => b.count - a.count)
}

/**
 * Replie les bonus de set (2/4 pièces) dans des bonus PV/ATQ/DEF/VIT déjà
 * agrégés (catalogue + substats). Fonction pure utilisée par
 * `useCardClassicStatsWithSetBonuses`, elle-même consommée par `CombatPanel`
 * et `CardViewModal` — les deux blocs qui affichent PV/ATQ/DEF/VIT côte à
 * côte dans la même fenêtre. Les autres consommateurs de
 * `aggregateEquipmentBonuses`/`useCardEquipmentBonuses` (tri de collection
 * dans `CollectionCard`/`collection.tsx`, puissance d'équipe dans
 * `TeamEditorPopup`) ne l'utilisent pas : leur écart préexistant avec le
 * combat réel est hors périmètre de cette carte, et jamais vu côte à côte
 * avec `CombatPanel`.
 */
export function withCardSetBonuses(
  bonuses: StatBonuses,
  setBonuses: Record<string, number>,
): StatBonuses {
  return {
    hp: {
      flat: bonuses.hp.flat,
      pct: bonuses.hp.pct + (setBonuses.hpPct ?? 0),
    },
    atk: {
      flat: bonuses.atk.flat,
      pct: bonuses.atk.pct + (setBonuses.atkPct ?? 0),
    },
    def: {
      flat: bonuses.def.flat,
      pct: bonuses.def.pct + (setBonuses.defPct ?? 0),
    },
    spd: {
      flat: bonuses.spd.flat,
      pct: bonuses.spd.pct + (setBonuses.spdPct ?? 0),
    },
  }
}

/**
 * Same as `finalStat` but folds in equipment flat + percent bonuses, matching
 * the backend's `(raw + flat) * (1 + pct/100)` order.
 */
export function finalStatWithBonuses(
  baseStat: number,
  level: number,
  variant: CardVariant,
  palier: number,
  bonus: StatBonus,
): number {
  const raw =
    statAtLevel(baseStat, level) *
    VARIANT_MULT[variant] *
    palierMultiplier(palier)
  return (raw + bonus.flat) * (1 + bonus.pct / 100)
}

/**
 * Puissance d'une carte possédée, équipement inclus. Source unique partagée par
 * la grille de collection, le tri, le popup de détail et l'éditeur d'équipe pour
 * que la même carte affiche toujours la même valeur. Chaque stat est arrondie
 * avant l'agrégation (même ordre que le panneau de détail). Passer
 * `emptyStatBonuses()` donne la puissance de base (sans équipement), utile quand
 * l'équipement n'est pas disponible (collection d'un autre joueur).
 */
export function cardPower(
  card: { baseHp: number; baseAtk: number; baseDef: number; baseSpd: number },
  level: number,
  variant: CardVariant,
  palier: number,
  bonuses: StatBonuses,
): number {
  return computePower({
    hp: Math.round(
      finalStatWithBonuses(card.baseHp, level, variant, palier, bonuses.hp),
    ),
    atk: Math.round(
      finalStatWithBonuses(card.baseAtk, level, variant, palier, bonuses.atk),
    ),
    def: Math.round(
      finalStatWithBonuses(card.baseDef, level, variant, palier, bonuses.def),
    ),
    spd: Math.round(
      finalStatWithBonuses(card.baseSpd, level, variant, palier, bonuses.spd),
    ),
  })
}

export function goldCostNextLevel(
  currentLevel: number,
  rarity: CardRarity,
  card: EconomyConfig['card'],
): number {
  return Math.round(
    card.goldCostBase *
      currentLevel ** card.goldCostExp *
      card.rarityMult[rarity],
  )
}

export function dustCostNextLevel(
  currentLevel: number,
  rarity: CardRarity,
  card: EconomyConfig['card'],
): number {
  return Math.round(
    card.dustCostBase *
      currentLevel ** card.dustCostExp *
      card.rarityMult[rarity],
  )
}

export function equipGoldCostNextLevel(
  currentLevel: number,
  rarity: CardRarity,
  economy: EconomyConfig,
): number {
  return Math.round(
    economy.equip.goldCostBase *
      economy.equip.goldCostExp ** (currentLevel - 1) *
      economy.card.rarityMult[rarity],
  )
}

export function maxLevelInPalier(palier: number): number {
  return 10 * palier
}

/**
 * Formate une clé de bonus d'équipement (`hpFlat`, `atkPct`, …) en libellé
 * lisible : `hpFlat` → `PV`, `atkPct` → `% ATK`, etc.
 */
// Les 4 stats de stuff (report explicite du plan précédent) n'ont pas de
// forme "Flat", et leur nom composé ne se lit pas bien en simple majuscules
// (`CRITRATE`) : un libellé dédié, dans le même esprit que `HP` → `PV`.
const STUFF_STAT_LABELS: Record<string, string> = {
  CRITRATE: 'TAUX CRIT',
  CRITDMG: 'DÉGÂTS CRIT',
  ARMORPEN: 'PÉNÉTRATION ARMURE',
  LIFESTEAL: 'VOL DE VIE',
}

// Clé de bonus → couleur de stat. Les clés portent leur stat en préfixe
// (`hpFlat`, `atkPct`, `critRatePct`…), donc on teste le préfixe plutôt que
// d'énumérer les 12 clés — une 13e stat n'aurait rien à changer ici.
// Partagé par la fiche de pièce et le guide des sets : une seule table de
// correspondance, sinon les deux écrans finissent par diverger.
const STAT_COLOR_BY_PREFIX: [string, string][] = [
  ['hp', 'var(--stat-hp)'],
  ['atk', 'var(--stat-atk)'],
  ['def', 'var(--stat-def)'],
  ['spd', 'var(--stat-spd)'],
  ['crit', 'var(--stat-crit)'],
  ['armorPen', 'var(--stat-armorpen)'],
  ['lifesteal', 'var(--stat-lifesteal)'],
]

/** Variable CSS de couleur associée à une clé de bonus/sous-stat. */
export function statColorVar(key: string): string {
  const hit = STAT_COLOR_BY_PREFIX.find(([prefix]) => key.startsWith(prefix))
  return hit ? hit[1] : 'var(--stat-def)'
}

export function formatBonusKey(key: string): string {
  if (key.endsWith('Flat')) {
    const base = key.replace('Flat', '').toUpperCase()
    return base === 'HP' ? 'PV' : base
  }
  if (key.endsWith('Pct')) {
    const base = key.replace('Pct', '').toUpperCase()
    return `% ${STUFF_STAT_LABELS[base] ?? (base === 'HP' ? 'PV' : base)}`
  }
  return key
}

export function isAtTopOfPalier(level: number, palier: number): boolean {
  return level === maxLevelInPalier(palier)
}

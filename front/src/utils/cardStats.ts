import type { EconomyConfig } from '../api/economy.api'
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
export function formatBonusKey(key: string): string {
  if (key.endsWith('Flat')) {
    const base = key.replace('Flat', '').toUpperCase()
    return base === 'HP' ? 'PV' : base
  }
  if (key.endsWith('Pct')) {
    const base = key.replace('Pct', '').toUpperCase()
    return `% ${base === 'HP' ? 'PV' : base}`
  }
  return key
}

export function isAtTopOfPalier(level: number, palier: number): boolean {
  return level === maxLevelInPalier(palier)
}

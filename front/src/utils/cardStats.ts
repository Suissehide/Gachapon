import type { EconomyConfig } from '../api/economy.api'
import type { CardRarity, CardVariant } from '../constants/card.constant'

const VARIANT_MULT: Record<CardVariant, number> = {
  NORMAL: 1.0,
  BRILLIANT: 1.15,
  HOLOGRAPHIC: 1.3,
}

const STAT_GROWTH_PER_LEVEL = 0.06
const ASCENSION_STAT_BONUS = 0.15

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
 * Puissance agrégée d'une carte, à partir de ses stats finales.
 * Formule pondérée partagée (grille collection, popup, team editor, campagne).
 */
export function computePower(stats: {
  hp: number
  atk: number
  def: number
  spd: number
}): number {
  return Math.round(stats.hp / 2 + stats.atk * 1.5 + stats.def + stats.spd)
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

/**
 * Aggregate the flat/percent bonuses of every equipment piece equipped on a
 * given card: catalog base scaled by instance level, plus substats. Mirrors
 * `effectiveEquipmentBonuses` + `computeFinalStats` in the backend.
 */
export function aggregateEquipmentBonuses(
  items: {
    equippedOnId: string | null
    bonuses: Record<string, number>
    level: number
    substats: { key: string; value: number }[]
  }[],
  userCardId: string,
  equipLevelScale: number,
): StatBonuses {
  const acc = emptyStatBonuses()
  for (const item of items) {
    if (item.equippedOnId !== userCardId) {
      continue
    }
    const mult = 1 + equipLevelScale * (item.level - 1)
    for (const [key, value] of Object.entries(item.bonuses)) {
      const parsed = parseBonusKey(key)
      if (parsed) {
        acc[parsed.stat][parsed.kind] += value * mult
      }
    }
    for (const s of item.substats) {
      const parsed = parseBonusKey(s.key)
      if (parsed) {
        acc[parsed.stat][parsed.kind] += s.value
      }
    }
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

export function isAtTopOfPalier(level: number, palier: number): boolean {
  return level === maxLevelInPalier(palier)
}

import type { CardRarity } from '../../types/domain/gacha/gacha.types'

export const RARITY_MULT: Record<CardRarity, number> = {
  COMMON: 1.0,
  UNCOMMON: 1.3,
  RARE: 1.7,
  EPIC: 2.3,
  LEGENDARY: 3.0,
}

export const STAT_GROWTH_PER_LEVEL = 0.06

export function maxLevelInPalier(palier: number): number {
  return 10 * palier
}

export function isAtTopOfPalier(level: number, palier: number): boolean {
  return level === maxLevelInPalier(palier)
}

/**
 * Cost in gold to go from `currentLevel` to `currentLevel + 1`.
 * Caller is responsible for checking the level is within palier bounds.
 */
export function goldCostNextLevel(
  currentLevel: number,
  rarity: CardRarity,
  base = 5,
  exp = 1.6,
  rarityMult: Record<CardRarity, number> = RARITY_MULT,
): number {
  return Math.round(base * currentLevel ** exp * rarityMult[rarity])
}

/**
 * Cost in dust to go from `currentLevel` to `currentLevel + 1`.
 */
export function dustCostNextLevel(
  currentLevel: number,
  rarity: CardRarity,
  base = 0.5,
  exp = 1.4,
  rarityMult: Record<CardRarity, number> = RARITY_MULT,
): number {
  return Math.round(base * currentLevel ** exp * rarityMult[rarity])
}

/**
 * Total gold cost to advance `from` to `to` (exclusive upper bound on the level you START at,
 * but inclusive on the target level — i.e., paying the sum of gold to reach `to`).
 * Example: from=1, to=3 means paying for 1→2 and 2→3.
 */
export function totalGoldCost(
  from: number,
  to: number,
  rarity: CardRarity,
  base = 5,
  exp = 1.6,
  rarityMult: Record<CardRarity, number> = RARITY_MULT,
): number {
  let total = 0
  for (let n = from; n < to; n++) {
    total += goldCostNextLevel(n, rarity, base, exp, rarityMult)
  }
  return total
}

export function totalDustCost(
  from: number,
  to: number,
  rarity: CardRarity,
  base = 0.5,
  exp = 1.4,
  rarityMult: Record<CardRarity, number> = RARITY_MULT,
): number {
  let total = 0
  for (let n = from; n < to; n++) {
    total += dustCostNextLevel(n, rarity, base, exp, rarityMult)
  }
  return total
}

/**
 * Returns the stat value at a given level, applying the +6% per level growth.
 * Level 1 returns baseStat (multiplier = 1.0).
 */
export function statAtLevel(baseStat: number, level: number): number {
  return baseStat * (1 + STAT_GROWTH_PER_LEVEL * (level - 1))
}

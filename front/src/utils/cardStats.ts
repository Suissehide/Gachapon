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
  return Math.pow(1 + ASCENSION_STAT_BONUS, palier - 1)
}

export function finalStat(
  baseStat: number,
  level: number,
  variant: CardVariant,
  palier: number,
): number {
  return statAtLevel(baseStat, level) * VARIANT_MULT[variant] * palierMultiplier(palier)
}

const RARITY_MULT: Record<CardRarity, number> = {
  COMMON: 1.0,
  UNCOMMON: 1.3,
  RARE: 1.7,
  EPIC: 2.3,
  LEGENDARY: 3.0,
}

export function goldCostNextLevel(currentLevel: number, rarity: CardRarity): number {
  return Math.round(5 * Math.pow(currentLevel, 1.6) * RARITY_MULT[rarity])
}

export function dustCostNextLevel(currentLevel: number, rarity: CardRarity): number {
  return Math.round(8 * Math.pow(currentLevel, 1.4) * RARITY_MULT[rarity])
}

export function maxLevelInPalier(palier: number): number {
  return 10 * palier
}

export function isAtTopOfPalier(level: number, palier: number): boolean {
  return level === maxLevelInPalier(palier)
}

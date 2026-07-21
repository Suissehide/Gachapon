import { useQuery } from '@tanstack/react-query'

import { type EconomyConfig, getEconomyConfig } from '../api/economy.api.ts'

export const DEFAULT_ECONOMY: EconomyConfig = {
  xp: {
    base: 100,
    slope: 30,
    levelCap: 100,
    skillPointsPerLevel: 1,
    milestones: [
      { level: 10, bonusPoints: 2, tokens: 5, dust: 100 },
      { level: 25, bonusPoints: 2, tokens: 10, dust: 300 },
      { level: 50, bonusPoints: 2, tokens: 15, dust: 800 },
      { level: 75, bonusPoints: 2, tokens: 20, dust: 1500 },
      { level: 100, bonusPoints: 2, tokens: 30, dust: 3000 },
    ],
  },
  gacha: {
    pullTokenCost: 1,
    pityThreshold: 80,
    tokenRegenIntervalMinutes: 120,
    tokenMaxStock: 6,
  },
  recycle: {
    COMMON: 10,
    UNCOMMON: 30,
    RARE: 80,
    EPIC: 240,
    LEGENDARY: 800,
  },
  card: {
    goldCostBase: 5,
    goldCostExp: 1.6,
    dustCostBase: 0.5,
    dustCostExp: 1.4,
    rarityMult: {
      COMMON: 1.0,
      UNCOMMON: 1.3,
      RARE: 1.7,
      EPIC: 2.3,
      LEGENDARY: 3.0,
    },
    statGrowthPerLevel: 0.06,
    ascensionStatBonus: 0.15,
    maxPalier: 6,
  },
  combat: { pointsMax: 60, regenSeconds: 900, battleCost: 5, sweepCost: 5 },
  wishlist: { priceMultiplier: 2, cooldownDays: 7 },
  equip: {
    goldCostBase: 25,
    goldCostExp: 1.35,
    levelScale: 0.1,
    maxLevel: 12,
    substatMilestone: 3,
    maxSubstatsByRarity: {
      COMMON: 0,
      UNCOMMON: 1,
      RARE: 2,
      EPIC: 3,
      LEGENDARY: 4,
    },
    salvageGold: {
      COMMON: 10,
      UNCOMMON: 30,
      RARE: 80,
      EPIC: 240,
      LEGENDARY: 800,
    },
    substatRanges: {
      hpFlat: { min: 20, max: 60 },
      atkFlat: { min: 5, max: 15 },
      defFlat: { min: 5, max: 15 },
      spdFlat: { min: 3, max: 9 },
      pct: { min: 3, max: 8 },
    },
  },
}

export function useEconomyConfig() {
  return useQuery({
    queryKey: ['economy', 'config'],
    queryFn: getEconomyConfig,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  })
}

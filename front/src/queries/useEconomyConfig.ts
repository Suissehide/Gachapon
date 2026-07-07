import { useQuery } from '@tanstack/react-query'

import { getEconomyConfig, type EconomyConfig } from '../api/economy.api.ts'

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
    COMMON: 5,
    UNCOMMON: 15,
    RARE: 40,
    EPIC: 120,
    LEGENDARY: 400,
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
}

export function useEconomyConfig() {
  return useQuery({
    queryKey: ['economy', 'config'],
    queryFn: getEconomyConfig,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  })
}

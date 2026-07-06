import { useQuery } from '@tanstack/react-query'

import { getEconomyConfig, type EconomyConfig } from '../api/economy.api.ts'

export const DEFAULT_ECONOMY: EconomyConfig = {
  xp: { base: 100, slope: 30, levelCap: 100 },
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

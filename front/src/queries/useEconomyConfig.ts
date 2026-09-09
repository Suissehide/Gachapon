import { useQuery } from '@tanstack/react-query'

import { type EconomyConfig, getEconomyConfig } from '../api/economy.api.ts'

export const DEFAULT_ECONOMY: EconomyConfig = {
  xp: {
    base: 100,
    slope: 44,
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
    pityThreshold: 300,
    tokenRegenIntervalMinutes: 60,
    tokenMaxStock: 10,
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
    statGrowthPerLevel: 0.09,
    ascensionStatBonus: 0.15,
    maxPalier: 7,
  },
  combat: {
    pointsMax: 60,
    regenSeconds: 900,
    battleCost: 5,
    sweepCost: 5,
    elementAdvantageMult: 1.3,
    elementDisadvantageMult: 0.75,
    baseCritRate: 5,
    baseCritDmg: 150,
    baseArmorPen: 0,
    baseLifesteal: 0,
  },
  wishlist: { priceMultiplier: 2, cooldownDays: 7 },
  duel: { pullCount: 5 },
  bet: { pullWindow: 10, minStake: 50, maxStake: 2000 },
  equip: {
    goldCostBase: 25,
    goldCostExp: 1.35,
    levelScale: 0.1,
    maxLevel: 12,
    substatMilestone: 3,
    maxSubstats: 4,
    initialSubstatsByRarity: {
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
      hpPct: { min: 3, max: 8 },
      atkFlat: { min: 5, max: 15 },
      atkPct: { min: 3, max: 8 },
      defFlat: { min: 5, max: 15 },
      defPct: { min: 3, max: 8 },
      spdFlat: { min: 3, max: 9 },
      spdPct: { min: 3, max: 8 },
      critRatePct: { min: 2, max: 5 },
      critDmgPct: { min: 4, max: 10 },
      armorPenPct: { min: 2, max: 6 },
      lifestealPct: { min: 1, max: 4 },
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

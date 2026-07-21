import { apiUrl } from '../constants/config.constant.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type CardRarityKey =
  | 'COMMON'
  | 'UNCOMMON'
  | 'RARE'
  | 'EPIC'
  | 'LEGENDARY'

export type MilestonePackConfig = {
  level: number
  bonusPoints: number
  tokens: number
  dust: number
}

export interface EconomyConfig {
  xp: {
    base: number
    slope: number
    levelCap: number
    skillPointsPerLevel: number
    milestones: MilestonePackConfig[]
  }
  gacha: {
    pullTokenCost: number
    pityThreshold: number
    tokenRegenIntervalMinutes: number
    tokenMaxStock: number
  }
  recycle: Record<CardRarityKey, number>
  card: {
    goldCostBase: number
    goldCostExp: number
    dustCostBase: number
    dustCostExp: number
    rarityMult: Record<CardRarityKey, number>
    statGrowthPerLevel: number
    ascensionStatBonus: number
    maxPalier: number
  }
  combat: {
    pointsMax: number
    regenSeconds: number
    battleCost: number
    sweepCost: number
  }
  wishlist: {
    priceMultiplier: number
    cooldownDays: number
  }
  equip: {
    goldCostBase: number
    goldCostExp: number
    levelScale: number
    maxLevel: number
    substatMilestone: number
    maxSubstats: number
    salvageGold: Record<CardRarityKey, number>
    substatRanges: {
      hpFlat: { min: number; max: number }
      atkFlat: { min: number; max: number }
      defFlat: { min: number; max: number }
      spdFlat: { min: number; max: number }
      pct: { min: number; max: number }
    }
  }
}

export async function getEconomyConfig(): Promise<EconomyConfig> {
  const res = await fetchWithAuth(`${apiUrl}/economy/config`)
  if (!res.ok) {
    throw new Error('Failed to load economy config')
  }
  return res.json()
}

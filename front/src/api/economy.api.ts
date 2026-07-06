import { apiUrl } from '../constants/config.constant.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type CardRarityKey = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

export interface EconomyConfig {
  xp: { base: number; slope: number; levelCap: number }
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
}

export async function getEconomyConfig(): Promise<EconomyConfig> {
  const res = await fetchWithAuth(`${apiUrl}/economy/config`)
  if (!res.ok) {
    throw new Error('Failed to load economy config')
  }
  return res.json()
}

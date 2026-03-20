import type { UserUpgradeEffects } from '../../types/domain/economy/economy.types'

export type { UserUpgradeEffects }

type UpgradeRow = {
  type: string
  level: number
  effect: number
  dustCost: number
}

const NEUTRAL_EFFECTS: UserUpgradeEffects = {
  regenReductionMinutes: 0,
  luckMultiplier: 1.0,
  dustHarvestMultiplier: 1.0,
  tokenVaultBonus: 0,
}

export function getUpgradeEffectsFromRows(
  rows: UpgradeRow[],
): UserUpgradeEffects {
  const result = { ...NEUTRAL_EFFECTS }
  for (const row of rows) {
    switch (row.type) {
      case 'REGEN':
        result.regenReductionMinutes = row.effect
        break
      case 'LUCK':
        result.luckMultiplier = row.effect
        break
      case 'DUST_HARVEST':
        result.dustHarvestMultiplier = row.effect
        break
      case 'TOKEN_VAULT':
        result.tokenVaultBonus = row.effect
        break
    }
  }
  return result
}

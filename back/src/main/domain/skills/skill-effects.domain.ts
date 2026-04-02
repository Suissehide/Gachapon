import type { UserUpgradeEffects } from '../../types/domain/economy/economy.types'

type SkillEffectRow = {
  effectType: string
  effect: number
}

const NEUTRAL_EFFECTS: UserUpgradeEffects = {
  regenReductionMinutes: 0,
  luckMultiplier: 1.0,
  dustHarvestMultiplier: 1.0,
  tokenVaultBonus: 0,
  freePullChance: 0,
  multiTokenChance: 0,
  goldenBallChance: 0,
  shopDiscount: 0,
}

export function getSkillEffects(rows: SkillEffectRow[]): UserUpgradeEffects {
  const result = { ...NEUTRAL_EFFECTS }
  for (const row of rows) {
    switch (row.effectType) {
      case 'REGEN':
        result.regenReductionMinutes += row.effect
        break
      case 'TOKEN_VAULT':
        result.tokenVaultBonus += row.effect
        break
      case 'LUCK':
        result.luckMultiplier += row.effect
        break
      case 'DUST_HARVEST':
        result.dustHarvestMultiplier += row.effect
        break
      case 'FREE_PULL_CHANCE':
        result.freePullChance += row.effect
        break
      case 'MULTI_TOKEN_CHANCE':
        result.multiTokenChance += row.effect
        break
      case 'GOLDEN_BALL_CHANCE':
        result.goldenBallChance += row.effect
        break
      case 'SHOP_DISCOUNT':
        result.shopDiscount += row.effect
        break
    }
  }
  return result
}

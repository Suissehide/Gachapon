import type { SkillEffectType } from '../../../generated/client'
import type { UserUpgradeEffects } from '../../types/domain/economy/economy.types'

type SkillEffectRow = {
  effectType: SkillEffectType
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
  pullXpBonus: 0,
  pityReduction: 0,
  variantLuckMultiplier: 1.0,
  dailyShopSlots: 0,
  wishlistCooldownReductionDays: 0,
  pcVaultBonus: 0,
  pcRegenReductionSeconds: 0,
  sweepCostReduction: 0,
  goldBonus: 0,
  combatXpBonus: 0,
  dropBonus: 0,
  upgradeDustDiscount: 0,
  goldShopDiscount: 0,
  dailyShopLuckMultiplier: 1.0,
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
        result.luckMultiplier += row.effect / 100
        break
      case 'DUST_HARVEST':
        result.dustHarvestMultiplier += row.effect / 100
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
      case 'PULL_XP_BONUS':
        result.pullXpBonus += row.effect
        break
      case 'PITY_BOOST':
        result.pityReduction += row.effect
        break
      case 'VARIANT_LUCK':
        result.variantLuckMultiplier += row.effect / 100
        break
      case 'DAILY_SHOP_SLOT':
        result.dailyShopSlots += row.effect
        break
      case 'WISHLIST_COOLDOWN':
        result.wishlistCooldownReductionDays += row.effect
        break
      case 'PC_VAULT':
        result.pcVaultBonus += row.effect
        break
      case 'PC_REGEN':
        result.pcRegenReductionSeconds += row.effect
        break
      case 'SWEEP_COST':
        result.sweepCostReduction += row.effect
        break
      case 'GOLD_BONUS':
        result.goldBonus += row.effect
        break
      case 'COMBAT_XP_BONUS':
        result.combatXpBonus += row.effect
        break
      case 'DROP_BONUS':
        result.dropBonus += row.effect
        break
      case 'UPGRADE_DUST_DISCOUNT':
        result.upgradeDustDiscount += row.effect
        break
      case 'GOLD_SHOP_DISCOUNT':
        result.goldShopDiscount += row.effect
        break
      case 'DAILY_SHOP_LUCK':
        result.dailyShopLuckMultiplier += row.effect / 100
        break
    }
  }
  return result
}

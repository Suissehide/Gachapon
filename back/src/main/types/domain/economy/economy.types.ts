export type TokenState = {
  tokens: number
  newLastTokenAt: Date | null
  nextTokenAt: Date | null
}

export type UserUpgradeEffects = {
  regenReductionMinutes: number
  luckMultiplier: number
  dustHarvestMultiplier: number
  tokenVaultBonus: number
  freePullChance: number
  multiTokenChance: number
  goldenBallChance: number
  shopDiscount: number
  pullXpBonus: number
  pityReduction: number
  variantLuckMultiplier: number
  dailyShopSlots: number
  wishlistCooldownReductionDays: number
  pcVaultBonus: number
  pcRegenReductionSeconds: number
  sweepCostReduction: number
  goldBonus: number
  combatXpBonus: number
  dropBonus: number
}

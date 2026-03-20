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
}

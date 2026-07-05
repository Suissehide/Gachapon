export const CONFIG_KEYS = [
  'tokenRegenIntervalMinutes',
  'tokenMaxStock',
  'pityThreshold',
  'dustCommon',
  'dustUncommon',
  'dustRare',
  'dustEpic',
  'dustLegendary',
  'holoRateRare',
  'holoRateEpic',
  'holoRateLegendary',
  'brilliantRateRare',
  'brilliantRateEpic',
  'brilliantRateLegendary',
  'dailyShopPriceCommon',
  'dailyShopPriceUncommon',
  'dailyShopPriceRare',
  'dailyShopPriceEpic',
  'dailyShopPriceLegendary',
  'xpPerPull',
  'combat.pointsMax',
  'combat.regenSeconds',
  'combat.battleCost',
  'combat.sweepCost',
  'gacha.pullTokenCost',
  'xp.base',
  'xp.slope',
  'xp.levelCap',
  'card.goldCostBase',
  'card.goldCostExp',
  'card.dustCostBase',
  'card.dustCostExp',
  'card.rarityMultCommon',
  'card.rarityMultUncommon',
  'card.rarityMultRare',
  'card.rarityMultEpic',
  'card.rarityMultLegendary',
  'wishlist.priceMultiplier',
  'wishlist.cooldownDays',
] as const

export type ConfigKey = (typeof CONFIG_KEYS)[number]

export interface ConfigServiceInterface {
  get(key: ConfigKey): Promise<number>
  getMany<K extends ConfigKey>(...keys: K[]): Promise<Record<K, number>>
  set(key: ConfigKey, value: number): Promise<void>
  bootstrap(): Promise<void>
}

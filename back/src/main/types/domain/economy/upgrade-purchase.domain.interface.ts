export type UpgradeType = 'REGEN' | 'LUCK' | 'DUST_HARVEST' | 'TOKEN_VAULT'

export type UserUpgradeInfo = {
  type: UpgradeType
  currentLevel: number
  currentEffect: number | null
  nextLevel: number | null
  nextEffect: number | null
  nextCost: number | null
  canAfford: boolean
  isMaxed: boolean
}

export type BuyUpgradeResult = {
  type: string
  newLevel: number
  effect: number
  newDustTotal: number
}

export interface IUpgradePurchaseDomain {
  getUserUpgradesInfo(userId: string): Promise<UserUpgradeInfo[]>
  buy(userId: string, type: UpgradeType): Promise<BuyUpgradeResult>
}

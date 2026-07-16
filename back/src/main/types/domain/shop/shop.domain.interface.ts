import type { UnlockedAchievement } from '../../../domain/achievements/events.types'

export type BuyShopItemResult = {
  purchaseId: string
  currency: 'DUST' | 'GOLD'
  amountSpent: number
  newDustTotal: number
  newGoldTotal: number
  newTokenTotal: number
  newCombatPoints?: number
  unlockedAchievements: UnlockedAchievement[]
  item: {
    id: string
    name: string
    type: string
    value: unknown
  }
}

export interface IShopDomain {
  buy(userId: string, shopItemId: string): Promise<BuyShopItemResult>
}

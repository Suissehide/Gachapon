import type { ShopItem } from '../../../../generated/client'

export type BuyShopItemResult = {
  purchaseId: string
  dustSpent: number
  newDustTotal: number
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

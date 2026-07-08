export type DailyShopCard = {
  id: string
  name: string
  imageUrl: string | null
  rarity: string
  set: { id: string; name: string }
}

export type DailyShopItemResult = {
  id: string
  card: DailyShopCard
  dustPrice: number
  purchased: boolean
  /** Whether the user already owns this card (any variant). */
  owned: boolean
}

export type DailyShopResult = {
  date: string
  items: DailyShopItemResult[]
}

export type BuyDailyShopItemResult = {
  card: DailyShopCard
  dustSpent: number
  newDustBalance: number
}

export interface IDailyShopDomain {
  getOrGenerate(userId: string): Promise<DailyShopResult>
  buy(userId: string, itemId: string): Promise<BuyDailyShopItemResult>
}

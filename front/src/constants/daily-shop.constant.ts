import type { Card } from './card.constant'

export type DailyShopItem = {
  id: string
  card: Card
  dustPrice: number
  purchased: boolean
  /** Whether the user already owns this card (any variant). */
  owned: boolean
}

export type DailyShopResponse = {
  date: string
  items: DailyShopItem[]
}

export type BuyDailyShopResult = {
  card: Card
  dustSpent: number
  newDustBalance: number
}

export const DAILY_SHOP_ROUTES = {
  shop: '/daily-shop',
  buy: (itemId: string) => `/daily-shop/${itemId}/buy`,
} as const

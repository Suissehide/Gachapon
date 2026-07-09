import type { UnlockedAchievement } from './achievements.constant.ts'

export const ITEM_TYPE_OPTIONS = [
  { value: 'TOKEN_PACK', label: 'Token Pack' },
  { value: 'BOOST', label: 'Boost' },
  { value: 'COSMETIC', label: 'Cosmétique' },
  { value: 'MACHINE', label: 'Machine' },
]

export const CURRENCY_OPTIONS = [
  { value: 'DUST', label: 'Poussière' },
  { value: 'GOLD', label: 'Or' },
]

// Types
export type ShopCurrency = 'DUST' | 'GOLD'

export type ShopItem = {
  id: string
  name: string
  description: string
  type: 'TOKEN_PACK' | 'BOOST' | 'COSMETIC' | 'MACHINE'
  cost: number
  currency: ShopCurrency
  value: unknown
  activeBoost?: { pullsRemaining: number } | null
}

export type PurchaseResult = {
  purchaseId: string
  currency: ShopCurrency
  amountSpent: number
  newDustTotal: number
  newGoldTotal: number
  newTokenTotal: number
  item: { id: string; name: string; type: string; value: unknown }
  unlockedAchievements?: UnlockedAchievement[]
}

export type AdminShopItem = {
  id: string
  name: string
  description: string
  type: string
  cost: number
  currency: ShopCurrency
  value: unknown
  isActive: boolean
  createdAt: string
}

// Routes
export const SHOP_ROUTES = {
  items: '/shop',
  buy: (itemId: string) => `/shop/${itemId}/buy`,
  admin: {
    items: '/admin/shop-items',
    item: (id: string) => `/admin/shop-items/${id}`,
  },
} as const

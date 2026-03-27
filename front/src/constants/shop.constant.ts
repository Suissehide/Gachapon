export const ITEM_TYPE_OPTIONS = [
  { value: 'TOKEN_PACK', label: 'Token Pack' },
  { value: 'BOOST', label: 'Boost' },
  { value: 'COSMETIC', label: 'Cosmétique' },
]

// Types
export type ShopItem = {
  id: string
  name: string
  description: string
  type: 'TOKEN_PACK' | 'BOOST' | 'COSMETIC'
  dustCost: number
  value: unknown
}

export type PurchaseResult = {
  purchaseId: string
  dustSpent: number
  newDustTotal: number
  item: { id: string; name: string; type: string; value: unknown }
}

export type AdminShopItem = {
  id: string
  name: string
  description: string
  type: string
  dustCost: number
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

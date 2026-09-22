import i18n from '../i18n/index.ts'
import type { UnlockedAchievement } from './achievements.constant.ts'

// Résolu une fois au chargement du module — sûr ici parce que
// `useLocale().switchTo` fait toujours un rechargement dur de la page (voir
// `i18n/useLocale.ts`).
export const ITEM_TYPE_OPTIONS = [
  { value: 'TOKEN_PACK', label: i18n.t('shop:itemType.TOKEN_PACK') },
  { value: 'ENERGY_PACK', label: i18n.t('shop:itemType.ENERGY_PACK') },
  { value: 'BOOST', label: i18n.t('shop:itemType.BOOST') },
  { value: 'COSMETIC', label: i18n.t('shop:itemType.COSMETIC') },
  { value: 'MACHINE', label: i18n.t('shop:itemType.MACHINE') },
]

export const CURRENCY_OPTIONS = [
  { value: 'DUST', label: i18n.t('shop:currency.DUST') },
  { value: 'GOLD', label: i18n.t('shop:currency.GOLD') },
]

// Types
export type ShopCurrency = 'DUST' | 'GOLD'

export type ShopItem = {
  id: string
  name: string
  description: string
  type: 'TOKEN_PACK' | 'ENERGY_PACK' | 'BOOST' | 'COSMETIC' | 'MACHINE'
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
  newCombatPoints?: number
  item: { id: string; name: string; type: string; value: unknown }
  unlockedAchievements?: UnlockedAchievement[]
}

export type AdminShopItem = {
  id: string
  name: string
  nameFr: string
  nameEn: string
  description: string
  descriptionFr: string
  descriptionEn: string
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

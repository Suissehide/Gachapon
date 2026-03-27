// Types
export type UpgradeType = 'REGEN' | 'LUCK' | 'DUST_HARVEST' | 'TOKEN_VAULT'

export type UpgradeStatus = {
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
  type: UpgradeType
  newLevel: number
  effect: number
  newDustTotal: number
}

export type UpgradeConfigRow = {
  type: UpgradeType
  level: number
  effect: number
  dustCost: number
}

// Routes
export const UPGRADE_ROUTES = {
  upgrades: '/upgrades',
  buy: (type: UpgradeType) => `/upgrades/${type}/buy`,
  admin: {
    upgrades: '/admin/upgrades',
  },
} as const

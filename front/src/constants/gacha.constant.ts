import type { UnlockedAchievement } from './achievements.constant'
import type { CardElement, CardRarity } from './card.constant.ts'

// Types
export type PullResult = {
  card: {
    id: string
    name: string
    imageUrl: string | null
    rarity: string
    element: CardElement | null
    variant: string | null
    set: { id: string; name: string }
  }
  wasDuplicate: boolean
  dustEarned: number
  tokensRemaining: number
  pityCurrent: number
  xpGained: number
  unlockedAchievements?: UnlockedAchievement[]
}

export type TokenBalance = {
  tokens: number
  maxStock: number
  nextTokenAt: string | null
  pityCurrent: number
  pityThreshold: number
}

export type DropRate = {
  rarity: CardRarity
  pct: number
}

export type PullHistory = {
  pulls: Array<{
    id: string
    pulledAt: string
    wasDuplicate: boolean
    dustEarned: number
    card: {
      id: string
      name: string
      imageUrl: string | null
      rarity: string
      variant: string | null
    }
  }>
  total: number
  page: number
  limit: number
}

export type PullBatchEntry = {
  card: {
    id: string
    name: string
    imageUrl: string | null
    rarity: string
    element: CardElement | null
    variant: string | null
    set: { id: string; name: string }
  }
  wasDuplicate: boolean
  dustEarned: number
  pityCurrent: number
  wasFreePull: boolean
  wasGoldenBall: boolean
  wasBoostGuarantee: boolean
  // Succès débloqués par cette carte — affichés au flip de la carte (anti-spoil).
  unlockedAchievements?: UnlockedAchievement[]
}

export type PullBatchResult = {
  pulls: PullBatchEntry[]
  tokensRemaining: number
  xpGained: number
  unlockedAchievements?: UnlockedAchievement[]
}

export type CapsuleType =
  | 'ASTRAL'
  | 'FIRE'
  | 'WATER'
  | 'NATURE'
  | 'EARTH'
  | 'COMET'

export type Capsule = {
  type: CapsuleType
  quantity: number
  pityCurrent: number
  pityThreshold: number
}

export type CapsulePullResult = PullBatchResult & {
  capsulesRemaining: number
  capsulePityCurrent: number
}

export type CometCard = {
  id: string
  name: string
  imageUrl: string | null
  rarity: CardRarity
  element: CardElement | null
  set: { id: string; name: string }
}

export type CometCapsule = {
  current: { endsAt: string; cards: CometCard[] }
  next: { startsAt: string; cards: CometCard[] }
}

// Routes
export const GACHA_ROUTES = {
  tokenBalance: '/tokens/balance',
  pull: '/pulls',
  pullBatch: '/pulls/batch',
  pullCapsule: (type: CapsuleType) => `/pulls/capsules/${type}`,
  capsules: '/capsules',
  cometCapsule: '/capsules/comet',
  history: (page: number) => `/pulls/history?page=${page}`,
  rates: '/pulls/rates',
  recent: (opts?: {
    limit?: number
    before?: string
    teamId?: string
    rarities?: string[]
  }) => {
    const params = new URLSearchParams()
    params.set('limit', String(opts?.limit ?? 20))
    if (opts?.before) {
      params.set('before', opts.before)
    }
    if (opts?.teamId) {
      params.set('teamId', opts.teamId)
    }
    if (opts?.rarities && opts.rarities.length > 0) {
      params.set('rarities', opts.rarities.join(','))
    }
    return `/pulls/recent?${params.toString()}`
  },
} as const

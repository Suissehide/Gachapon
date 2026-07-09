import type { UnlockedAchievement } from './achievements.constant'
import type { CardRarity } from './card.constant'

// Types
export type PendingReward = {
  id: string
  source: 'STREAK' | 'ACHIEVEMENT' | 'QUEST' | 'LEVEL_UP'
  sourceId: string | null
  sourceTitle: string | null
  createdAt: string
  reward: {
    tokens: number
    dust: number
    xp: number
    gold: number
    cardRarity?: CardRarity | null
  }
  streakMilestone: { day: number; isMilestone: boolean } | null
}

/** A card granted by claiming a reward — shaped to build a reveal entry. */
export type ClaimedCard = {
  card: {
    id: string
    name: string
    imageUrl: string | null
    rarity: string
    variant: string | null
    set: { id: string; name: string }
  }
  wasDuplicate: boolean
}

export type ClaimResult = {
  tokens: number
  dust: number
  xp: number
  level: number
  pendingRewardsCount: number
  unlockedAchievements?: UnlockedAchievement[]
  cards?: ClaimedCard[]
}

// Routes
export const REWARD_ROUTES = {
  pending: '/rewards/pending',
  claim: (rewardId: string) => `/rewards/${rewardId}/claim`,
  claimAll: '/rewards/claim-all',
} as const

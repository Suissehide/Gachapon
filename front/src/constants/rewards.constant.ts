import type { UnlockedAchievement } from './achievements.constant'

// Types
export type PendingReward = {
  id: string
  source: 'STREAK' | 'ACHIEVEMENT' | 'QUEST'
  sourceId: string | null
  createdAt: string
  reward: { tokens: number; dust: number; xp: number; gold: number }
  streakMilestone: { day: number; isMilestone: boolean } | null
}

export type ClaimResult = {
  tokens: number
  dust: number
  xp: number
  level: number
  pendingRewardsCount: number
  unlockedAchievements?: UnlockedAchievement[]
}

// Routes
export const REWARD_ROUTES = {
  pending: '/rewards/pending',
  claim: (rewardId: string) => `/rewards/${rewardId}/claim`,
  claimAll: '/rewards/claim-all',
} as const

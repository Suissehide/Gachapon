// Types
export type PendingReward = {
  id: string
  source: 'STREAK' | 'ACHIEVEMENT' | 'QUEST'
  sourceId: string | null
  createdAt: string
  reward: { tokens: number; dust: number; xp: number }
  streakMilestone: { day: number; isMilestone: boolean } | null
}

export type ClaimResult = {
  tokens: number
  dust: number
  xp: number
  level: number
  pendingRewardsCount: number
}

// Routes
export const REWARD_ROUTES = {
  pending: '/rewards/pending',
  claim: (rewardId: string) => `/rewards/${rewardId}/claim`,
  claimAll: '/rewards/claim-all',
} as const

// Types
export type UnlockedAchievement = {
  key: string
  name: string
  iconKey: string | null
  reward: {
    tokens: number
    dust: number
    xp: number
    cardRarity: string | null
  } | null
}

export type AchievementWithProgress = {
  key: string
  name: string
  description: string
  family: string | null
  tier: number
  hidden: boolean
  iconKey: string | null
  sortOrder: number
  progress: number
  threshold: number
  unlocked: boolean
  unlockedAt: string | null
  reward: {
    tokens: number
    dust: number
    xp: number
    cardRarity: string | null
  } | null
}

export type FamilySummary = {
  family: string
  total: number
  unlocked: number
}

// Routes
export const ACHIEVEMENT_ROUTES = {
  list: '/achievements',
  families: '/achievements/families',
} as const

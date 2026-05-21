// Types
export type CollectorEntry = {
  rank: number
  user: { id: string; username: string; avatar: string | null }
  distinctCards: number
  cardPercentage: number
  totalVariants: number
  variantPercentage: number
}

export type TeamEntry = {
  rank: number
  team: { id: string; name: string; slug: string; memberCount: number }
  avgScore: number
}

export type Leaderboard = {
  collectors: CollectorEntry[]
  bestTeams: TeamEntry[]
}

export type Quest = {
  id: string
  key: string
  name: string
  description: string
  rewardTokens: number
  rewardDust: number
}

// Routes
export const LEADERBOARD_ROUTES = {
  leaderboard: '/leaderboard',
  quests: '/quests',
} as const

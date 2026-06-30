export const LEADERBOARD_TOP_N = 10

export type LeaderboardUserMini = {
  id: string
  username: string
  level: number
  avatar: string | null
}

export type CollectorEntry = {
  rank: number
  user: LeaderboardUserMini
  cardPercentage: number
  variantPercentage: number
  pulls: number
  legendaries: number
}

export type TeamEntry = {
  rank: number
  team: { id: string; name: string; slug: string; memberCount: number }
  cardPercentage: number
  variantPercentage: number
  pullsTotal: number
}

export type CombatEntry = {
  rank: number
  user: LeaderboardUserMini
  palier: number
  maxPalier: number
  combatPower: number
}

export type LeaderboardResponse<E> = {
  entries: E[]
  currentUserEntry: E | null
  /** Set only by the teams endpoint. */
  currentUserTeamId?: string | null
}

export type Quest = {
  id: string
  key: string
  name: string
  description: string
  rewardTokens: number
  rewardDust: number
}

export const LEADERBOARD_ROUTES = {
  collectors: '/leaderboard/collectors',
  teams: '/leaderboard/teams',
  combat: '/leaderboard/combat',
  quests: '/quests',
} as const

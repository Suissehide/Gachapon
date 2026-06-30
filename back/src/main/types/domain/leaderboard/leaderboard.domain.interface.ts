// Leaderboard domain — shapes the 3 ranking endpoints (collectors, teams, combat).

export type LeaderboardUserMini = {
  id: string
  username: string
  level: number
  avatar: string | null
}

export type CollectorEntry = {
  rank: number
  user: LeaderboardUserMini
  cardPercentage: number // 0..100 integer
  variantPercentage: number // 0..100 integer
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
  /** Set only by the teams endpoint — lets the front highlight "my team"
   *  even when it's in the top entries (no other way to know). */
  currentUserTeamId?: string | null
}

export const LEADERBOARD_TOP_N = 10

export interface ILeaderboardDomain {
  getCollectorsLeaderboard(
    currentUserId: string,
  ): Promise<LeaderboardResponse<CollectorEntry>>
  getTeamsLeaderboard(
    currentUserId: string,
  ): Promise<LeaderboardResponse<TeamEntry>>
  getCombatLeaderboard(
    currentUserId: string,
  ): Promise<LeaderboardResponse<CombatEntry>>
}

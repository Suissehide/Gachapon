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
  stage: string | null
  maxPalier: number
  combatPower: number
}

export type LeaderboardResponse<E> = {
  entries: E[]
  currentUserEntry: E | null
  /** Nombre total de classés, au-delà de la page renvoyée dans `entries`. */
  totalCount: number
  /** Page renvoyée (base 1) et taille de page, fixée par le serveur. */
  page: number
  pageSize: number
  /** Set only by the teams endpoint. */
  currentUserTeamId?: string | null
}

/** « 6-7 · 57/150 » : l'étage parle au joueur, le compte situe sur la campagne. */
export function formatCampaignProgress(
  entry: Pick<CombatEntry, 'stage' | 'palier' | 'maxPalier'>,
): string {
  const count = `${entry.palier}/${entry.maxPalier}`
  return entry.stage ? `${entry.stage} · ${count}` : count
}

export const LEADERBOARD_ROUTES = {
  collectors: '/leaderboard/collectors',
  teams: '/leaderboard/teams',
  combat: '/leaderboard/combat',
} as const

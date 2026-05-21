import type { CardRarity, CardVariant } from '../../../../../generated/client'

export type CollectorRankingRow = {
  userId: string
  distinctCards: bigint
  totalVariants: bigint
}

export type ActiveCardCounts = {
  total: number
  variantEligible: number
}

export type LeaderboardUser = {
  id: string
  username: string
  avatar: string | null
}

export type TeamWithMembers = {
  id: string
  name: string
  slug: string
  members: { userId: string }[]
  _count: { members: number }
}

export type UserCardForScoring = {
  userId: string
  variant: CardVariant
  quantity: number
  card: { rarity: CardRarity }
}

export type QuestWithReward = {
  id: string
  key: string
  name: string
  description: string
  reward: { tokens: number; dust: number } | null
}

export interface ILeaderboardRepository {
  countActiveCards(): Promise<ActiveCardCounts>
  getCollectorRanking(limit: number): Promise<CollectorRankingRow[]>
  getUsersByIds(ids: string[]): Promise<LeaderboardUser[]>
  getTeamsWithMembers(limit: number): Promise<TeamWithMembers[]>
  getUserCardsByUserIds(userIds: string[]): Promise<UserCardForScoring[]>
  getActiveQuests(): Promise<QuestWithReward[]>
}

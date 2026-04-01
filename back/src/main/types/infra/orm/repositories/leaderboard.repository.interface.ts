import type { CardRarity, CardVariant } from '../../../../../generated/client'

export type CollectorRow = {
  userId: string
  _count: { cardId: number }
}

export type LeaderboardUser = {
  id: string
  username: string
  avatar: string | null
}

export type LegendaryRow = {
  userId: string
  _count: { cardId: number }
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
  countActiveCards(): Promise<number>
  getCollectorRows(limit: number): Promise<CollectorRow[]>
  getUsersByIds(ids: string[]): Promise<LeaderboardUser[]>
  getLegendaryCardIds(): Promise<string[]>
  getLegendaryRows(cardIds: string[], limit: number): Promise<LegendaryRow[]>
  getTeamsWithMembers(limit: number): Promise<TeamWithMembers[]>
  getUserCardsByUserIds(userIds: string[]): Promise<UserCardForScoring[]>
  getActiveQuests(): Promise<QuestWithReward[]>
}

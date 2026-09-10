import type { CardVariant } from '../../../../../generated/client'

export type CollectorRankingRowWithLevel = {
  userId: string
  distinctCards: bigint
  totalVariants: bigint
  level: number
}

export type ActiveCardCounts = {
  total: number
  variantEligible: number
}

export type TeamForRanking = {
  id: string
  name: string
  slug: string
  memberCount: number
  memberIds: string[]
}

/** Le strict nécessaire au score d'équipe : cartes distinctes et variantes. */
export type UserCardForScoring = {
  cardId: string
  userId: string
  variant: CardVariant
}

export type CombatTeamCardForPower = {
  userCardId: string
  level: number
  palier: number
  variant: CardVariant
  card: { baseHp: number; baseAtk: number; baseDef: number; baseSpd: number }
  equipmentBonuses: Record<string, number | undefined>[]
  /** Clés de set des pièces portées par cette carte — comptage par carte. */
  setKeys: string[]
}

export interface ILeaderboardRepository {
  countActiveCards(): Promise<ActiveCardCounts>
  getCollectorRankingWithLevel(
    limit: number,
  ): Promise<CollectorRankingRowWithLevel[]>
  getCurrentUserCollectorRow(
    userId: string,
  ): Promise<CollectorRankingRowWithLevel | null>
  countCollectorsAhead(
    userId: string,
    distinctCards: number,
    totalVariants: number,
  ): Promise<number>
  countPullsByUsers(userIds: string[]): Promise<Map<string, number>>
  countLegendariesByUsers(userIds: string[]): Promise<Map<string, number>>
  getTeamsForRanking(): Promise<TeamForRanking[]>
  getTeamIdForUser(userId: string): Promise<string | null>
  getUserCardsByUserIds(userIds: string[]): Promise<UserCardForScoring[]>
  countCampaignStages(): Promise<number>
  getCampaignProgressByUsers(
    userIds: string[],
  ): Promise<Map<string, { highestChapter: number; highestIndex: number }>>
  computePalierForProgress(
    progress: { highestChapter: number; highestIndex: number } | null,
    stagesOrdered: { chapter: number; index: number }[],
  ): number
  getActiveUserIds(): Promise<string[]>
  getCombatTeamCardsByUsers(
    userIds: string[],
  ): Promise<Map<string, CombatTeamCardForPower[]>>
  getAllCampaignStagesOrdered(): Promise<{ chapter: number; index: number }[]>
}

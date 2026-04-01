export type PublicStats = {
  totalUsers: number
  totalPulls: number
  totalCards: number
  activeUsers: number
  legendaryPulls: number
}

export interface IStatsRepository {
  getPublicStats(): Promise<PublicStats>
}

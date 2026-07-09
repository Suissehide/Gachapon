export type PublicStats = {
  totalUsers: number
  totalPulls: number
  totalCards: number
  activeUsers: number
  legendaryPulls: number
  pullsToday: number
  totalDust: number
  setsCount: number
  legendaryCardsCount: number
}

export interface IStatsRepository {
  getPublicStats(): Promise<PublicStats>
}

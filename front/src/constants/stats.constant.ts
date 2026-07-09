// Types
export type RecentLegendary = {
  cardName: string
  pulledAt: string
}

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
  activeToday: number
  recentLegendaries: RecentLegendary[]
}

// Routes
export const STATS_ROUTES = {
  public: '/stats',
} as const

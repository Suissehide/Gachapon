// Types
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

// Routes
export const STATS_ROUTES = {
  public: '/stats',
} as const

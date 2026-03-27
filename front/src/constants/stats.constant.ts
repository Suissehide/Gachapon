// Types
export type PublicStats = {
  totalUsers: number
  totalPulls: number
  totalCards: number
  activeUsers: number
  legendaryPulls: number
}

// Routes
export const STATS_ROUTES = {
  public: '/stats',
} as const

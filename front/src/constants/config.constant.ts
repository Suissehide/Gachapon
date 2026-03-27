export const environment = import.meta.env.VITE_ENVIRONMENT || 'development'
export const apiUrl = import.meta.env.VITE_API_URL

// Types
export type AdminConfig = {
  tokenRegenIntervalMinutes: number
  tokenMaxStock: number
  pityThreshold: number
  dustCommon: number
  dustUncommon: number
  dustRare: number
  dustEpic: number
  dustLegendary: number
  holoRateRare?: number
  holoRateEpic?: number
  holoRateLegendary?: number
  brilliantRateRare?: number
  brilliantRateEpic?: number
  brilliantRateLegendary?: number
  variantMultiplierHolo?: number
  variantMultiplierBrilliant?: number
}

export type ScoringConfig = {
  commonPoints: number
  uncommonPoints: number
  rarePoints: number
  epicPoints: number
  legendaryPoints: number
  brilliantMultiplier: number
  holographicMultiplier: number
}

// Routes
export const CONFIG_ROUTES = {
  admin: {
    config: '/admin/config',
    scoringConfig: '/admin/scoring-config',
    dashboard: '/admin/dashboard',
    stats: '/admin/stats',
  },
} as const

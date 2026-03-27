// Types
export type UserProfile = {
  id: string
  username: string
  avatar: string | null
  banner: string | null
  level: number
  xp: number
  dust: number
  createdAt: string
  stats: {
    totalPulls: number
    ownedCards: number
    legendaryCount: number
    dustGenerated: number
  }
  streakDays: number
  bestStreak: number
}

export type ApiKey = {
  id: string
  name: string
  lastUsedAt: string | null
  createdAt: string
}

export type ApiKeyCreated = ApiKey & { key: string }

// Routes
export const PROFILE_ROUTES = {
  profile: (username: string) => `/users/${username}/profile`,
  apiKeys: '/api-keys',
  apiKey: (id: string) => `/api-keys/${id}`,
} as const

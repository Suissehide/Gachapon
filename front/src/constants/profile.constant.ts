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
  lastLoginAt: string | null
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

export type FeaturedCard = {
  id: string
  name: string
  imageUrl: string | null
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
  variant: 'NORMAL' | 'BRILLIANT' | 'HOLOGRAPHIC'
  setId: string
  setName: string
}

export type SetProgression = {
  id: string
  name: string
  short: string
  hue: number
  owned: number
  total: number
  percent: number
}

// Routes
export const PROFILE_ROUTES = {
  profile: (username: string) => `/users/${username}/profile`,
  featuredCards: (username: string) =>
    `/users/${username}/profile/featured-cards`,
  setsProgression: (username: string) =>
    `/users/${username}/profile/sets-progression`,
  mySetFeaturedCards: '/users/me/featured-cards',
  myUsername: '/users/me/username',
  apiKeys: '/api-keys',
  apiKey: (id: string) => `/api-keys/${id}`,
} as const

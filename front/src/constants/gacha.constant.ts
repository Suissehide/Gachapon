// Types
export type PullResult = {
  card: {
    id: string
    name: string
    imageUrl: string | null
    rarity: string
    variant: string | null
    set: { id: string; name: string }
  }
  wasDuplicate: boolean
  dustEarned: number
  tokensRemaining: number
  pityCurrent: number
}

export type TokenBalance = {
  tokens: number
  maxStock: number
  nextTokenAt: string | null
}

export type PullHistory = {
  pulls: Array<{
    id: string
    pulledAt: string
    wasDuplicate: boolean
    dustEarned: number
    card: {
      id: string
      name: string
      imageUrl: string | null
      rarity: string
      variant: string | null
    }
  }>
  total: number
  page: number
  limit: number
}

// Routes
export const GACHA_ROUTES = {
  tokenBalance: '/tokens/balance',
  pull: '/pulls',
  history: (page: number) => `/pulls/history?page=${page}`,
  recent: (opts?: { limit?: number; before?: string; teamId?: string }) => {
    const params = new URLSearchParams()
    params.set('limit', String(opts?.limit ?? 20))
    if (opts?.before) params.set('before', opts.before)
    if (opts?.teamId) params.set('teamId', opts.teamId)
    return `/pulls/recent?${params.toString()}`
  },
} as const

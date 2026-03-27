// Types
export type StreakDayEntry = {
  day: number
  tokens: number
  dust: number
  xp: number
  isMilestone: boolean
  status: 'past' | 'current' | 'future'
}

export type StreakSummary = {
  streakDays: number
  bestStreak: number
  default: { tokens: number; dust: number; xp: number }
  days: StreakDayEntry[]
}

export type AdminMilestone = {
  id: string
  day: number
  tokens: number
  dust: number
  xp: number
}

export type AdminStreakConfig = {
  default: { tokens: number; dust: number; xp: number } | null
  defaultMilestoneId: string | null
  milestones: AdminMilestone[]
}

// Routes
export const STREAK_ROUTES = {
  summary: '/streak/summary',
  admin: {
    root: '/admin/streak',
    default: '/admin/streak/default',
    milestones: '/admin/streak/milestones',
    milestone: (id: string) => `/admin/streak/milestones/${id}`,
  },
} as const

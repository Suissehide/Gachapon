import type { CardRarity } from './card.constant.ts'

// Types
export type StreakReward = {
  tokens: number
  dust: number
  xp: number
  cardRarity: CardRarity | null
}

export type StreakDayEntry = StreakReward & {
  day: number
  isMilestone: boolean
  status: 'past' | 'current' | 'future'
}

export type StreakSummary = {
  streakDays: number
  bestStreak: number
  default: StreakReward
  days: StreakDayEntry[]
  /** Next milestone the user will reach in the current 30-day cycle (or null). */
  nextMilestone: StreakDayEntry | null
}

export type AdminMilestone = {
  id: string
  day: number
  tokens: number
  dust: number
  xp: number
  cardRarity: CardRarity | null
}

export type AdminStreakConfig = {
  default: StreakReward | null
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

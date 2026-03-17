import { useQuery } from '@tanstack/react-query'

import { api } from '../lib/api'

export type CollectorEntry = {
  rank: number
  user: { id: string; username: string; avatar: string | null }
  ownedCards: number
  percentage: number
}

export type LegendaryEntry = {
  rank: number
  user: { id: string; username: string; avatar: string | null }
  legendaryCount: number
}

export type TeamEntry = {
  rank: number
  team: { id: string; name: string; slug: string; memberCount: number }
  avgPercentage: number
}

export type Leaderboard = {
  collectors: CollectorEntry[]
  legendaries: LegendaryEntry[]
  bestTeams: TeamEntry[]
}

export type Quest = {
  id: string
  key: string
  name: string
  description: string
  rewardTokens: number
  rewardDust: number
}

export const useLeaderboard = () =>
  useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => api.get<Leaderboard>('/leaderboard'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

export const useQuests = () =>
  useQuery({
    queryKey: ['quests'],
    queryFn: () => api.get<{ quests: Quest[] }>('/quests'),
  })

import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

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

export const LeaderboardApi = {
  getLeaderboard: async (): Promise<Leaderboard> => {
    const res = await fetchWithAuth(`${apiUrl}/leaderboard`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération du classement')
    }
    return res.json()
  },

  getQuests: async (): Promise<{ quests: Quest[] }> => {
    const res = await fetchWithAuth(`${apiUrl}/quests`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération des quêtes')
    }
    return res.json()
  },
}

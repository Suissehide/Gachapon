import { apiUrl } from '../constants/config.constant.ts'

export type PublicStats = {
  totalUsers: number
  totalPulls: number
  totalCards: number
  activeUsers: number
  legendaryPulls: number
}

export const StatsApi = {
  getPublicStats: async (): Promise<PublicStats> => {
    const res = await fetch(`${apiUrl}/stats`)
    if (!res.ok) {
      throw new Error('Erreur lors de la récupération des statistiques')
    }
    return res.json()
  },
}

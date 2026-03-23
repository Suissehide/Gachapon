import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export const AdminStatsApi = {
  getDashboard: async (): Promise<{
    kpis: {
      totalUsers: number
      pullsToday: number
      dustGenerated: number
      legendaryCount: number
    }
    pullsSeries: { day: string; count: number }[]
  }> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/dashboard`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération du dashboard')
    }
    return res.json()
  },

  getStats: async (): Promise<{
    rarityDrift: {
      rarity: string
      realCount: number
      realPct: number
      theoreticalPct: number
    }[]
    neverPulledCards: {
      id: string
      name: string
      rarity: string
      setName: string
    }[]
    activeUsers: { sevenDays: number; thirtyDays: number }
    upgradeDistribution: {
      type: string
      levels: { level: number; count: number }[]
    }[]
  }> => {
    const res = await fetchWithAuth(`${apiUrl}/admin/stats`)
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        'Erreur lors de la récupération des statistiques',
      )
    }
    return res.json()
  },
}

import { apiUrl, CONFIG_ROUTES } from '../constants/config.constant.ts'
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
    const res = await fetchWithAuth(`${apiUrl}${CONFIG_ROUTES.admin.dashboard}`)
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
    skillDistribution: {
      nodeId: string
      level: number
      count: number
    }[]
  }> => {
    const res = await fetchWithAuth(`${apiUrl}${CONFIG_ROUTES.admin.stats}`)
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

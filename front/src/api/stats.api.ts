import { apiUrl } from '../constants/config.constant.ts'
import type { PublicStats } from '../constants/stats.constant.ts'
import { STATS_ROUTES } from '../constants/stats.constant.ts'

export type { PublicStats }

export const StatsApi = {
  getPublicStats: async (): Promise<PublicStats> => {
    const res = await fetch(`${apiUrl}${STATS_ROUTES.public}`)
    if (!res.ok) {
      throw new Error('Erreur lors de la récupération des statistiques')
    }
    return res.json()
  },
}

import { apiUrl } from '../constants/config.constant.ts'
import type {
  AchievementWithProgress,
  FamilySummary,
} from '../constants/achievements.constant.ts'
import { ACHIEVEMENT_ROUTES } from '../constants/achievements.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type { AchievementWithProgress, FamilySummary }

export const AchievementsApi = {
  list: async (): Promise<AchievementWithProgress[]> => {
    const res = await fetchWithAuth(`${apiUrl}${ACHIEVEMENT_ROUTES.list}`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération des succès')
    }
    return res.json()
  },

  families: async (): Promise<FamilySummary[]> => {
    const res = await fetchWithAuth(`${apiUrl}${ACHIEVEMENT_ROUTES.families}`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération des familles')
    }
    return res.json()
  },
}

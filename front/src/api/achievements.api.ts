import type {
  AchievementWithProgress,
  FamilySummary,
} from '../constants/achievements.constant.ts'
import { ACHIEVEMENT_ROUTES } from '../constants/achievements.constant.ts'
import { apiUrl } from '../constants/config.constant.ts'
import i18n from '../i18n/index.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type { AchievementWithProgress, FamilySummary }

export const AchievementsApi = {
  list: async (): Promise<AchievementWithProgress[]> => {
    const res = await fetchWithAuth(`${apiUrl}${ACHIEVEMENT_ROUTES.list}`)
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        i18n.t('achievements:apiTitles.operations.loadAchievements'),
      )
    }
    return res.json()
  },

  families: async (): Promise<FamilySummary[]> => {
    const res = await fetchWithAuth(`${apiUrl}${ACHIEVEMENT_ROUTES.families}`)
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        i18n.t('achievements:apiTitles.operations.loadFamilies'),
      )
    }
    return res.json()
  },
}

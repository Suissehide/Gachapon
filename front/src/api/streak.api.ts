import { apiUrl } from '../constants/config.constant.ts'
import type {
  StreakDayEntry,
  StreakSummary,
} from '../constants/streak.constant.ts'
import { STREAK_ROUTES } from '../constants/streak.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type { StreakDayEntry, StreakSummary }

export const StreakApi = {
  getSummary: async (): Promise<StreakSummary> => {
    const res = await fetchWithAuth(`${apiUrl}${STREAK_ROUTES.summary}`)
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        'Erreur lors de la récupération du résumé streak',
      )
    }
    return res.json()
  },
}

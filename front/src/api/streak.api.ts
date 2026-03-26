import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type StreakDayEntry = {
  day: number
  tokens: number
  dust: number
  xp: number
  isMilestone: boolean
  status: 'past' | 'current' | 'future'
}

export type StreakSummary = {
  streakDays: number
  bestStreak: number
  default: { tokens: number; dust: number; xp: number }
  days: StreakDayEntry[]
}

export const StreakApi = {
  getSummary: async (): Promise<StreakSummary> => {
    const res = await fetchWithAuth(`${apiUrl}/streak/summary`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération du résumé streak')
    }
    return res.json()
  },
}

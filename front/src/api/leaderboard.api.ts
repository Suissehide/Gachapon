import { apiUrl } from '../constants/config.constant.ts'
import type {
  CollectorEntry,
  Leaderboard,
  LegendaryEntry,
  Quest,
  TeamEntry,
} from '../constants/leaderboard.constant.ts'
import { LEADERBOARD_ROUTES } from '../constants/leaderboard.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type { CollectorEntry, LegendaryEntry, TeamEntry, Leaderboard, Quest }

export const LeaderboardApi = {
  getLeaderboard: async (): Promise<Leaderboard> => {
    const res = await fetchWithAuth(
      `${apiUrl}${LEADERBOARD_ROUTES.leaderboard}`,
    )
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération du classement')
    }
    return res.json()
  },

  getQuests: async (): Promise<{ quests: Quest[] }> => {
    const res = await fetchWithAuth(`${apiUrl}${LEADERBOARD_ROUTES.quests}`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération des quêtes')
    }
    return res.json()
  },
}

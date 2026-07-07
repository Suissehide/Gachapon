import { apiUrl } from '../constants/config.constant.ts'
import type {
  CollectorEntry,
  CombatEntry,
  LeaderboardResponse,
  TeamEntry,
} from '../constants/leaderboard.constant.ts'
import { LEADERBOARD_ROUTES } from '../constants/leaderboard.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type {
  CollectorEntry,
  CombatEntry,
  LeaderboardResponse,
  TeamEntry,
}

async function getJson<T>(path: string, errorMsg: string): Promise<T> {
  const res = await fetchWithAuth(`${apiUrl}${path}`)
  if (!res.ok) {
    handleHttpError(res, {}, errorMsg)
  }
  return res.json()
}

export const LeaderboardApi = {
  getCollectors: () =>
    getJson<LeaderboardResponse<CollectorEntry>>(
      LEADERBOARD_ROUTES.collectors,
      'Erreur lors de la récupération du classement Collectionneurs',
    ),
  getTeams: () =>
    getJson<LeaderboardResponse<TeamEntry>>(
      LEADERBOARD_ROUTES.teams,
      'Erreur lors de la récupération du classement Équipes',
    ),
  getCombat: () =>
    getJson<LeaderboardResponse<CombatEntry>>(
      LEADERBOARD_ROUTES.combat,
      'Erreur lors de la récupération du classement Combats',
    ),
}

import { apiUrl } from '../constants/config.constant.ts'
import type {
  CollectorEntry,
  CombatEntry,
  LeaderboardResponse,
  TeamEntry,
} from '../constants/leaderboard.constant.ts'
import { LEADERBOARD_ROUTES } from '../constants/leaderboard.constant.ts'
import i18n from '../i18n/index.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type { CollectorEntry, CombatEntry, LeaderboardResponse, TeamEntry }

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
      i18n.t('leaderboard:apiTitles.operations.loadCollectors'),
    ),
  getTeams: () =>
    getJson<LeaderboardResponse<TeamEntry>>(
      LEADERBOARD_ROUTES.teams,
      i18n.t('leaderboard:apiTitles.operations.loadTeams'),
    ),
  getCombat: () =>
    getJson<LeaderboardResponse<CombatEntry>>(
      LEADERBOARD_ROUTES.combat,
      i18n.t('leaderboard:apiTitles.operations.loadCombat'),
    ),
}

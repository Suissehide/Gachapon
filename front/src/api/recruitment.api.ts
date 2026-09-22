import { apiUrl } from '../constants/config.constant.ts'
import type {
  DirectoryTeam,
  MyJoinRequest,
  TeamJoinRequest,
} from '../constants/teams.constant.ts'
import { TEAM_ROUTES } from '../constants/teams.constant.ts'
import i18n from '../i18n/index.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type { DirectoryTeam, MyJoinRequest, TeamJoinRequest }

export const RecruitmentApi = {
  getDirectory: async (params: {
    cursor?: string
    search?: string
  }): Promise<{ teams: DirectoryTeam[]; nextCursor: string | null }> => {
    const qs = new URLSearchParams()
    if (params.cursor) {
      qs.set('cursor', params.cursor)
    }
    if (params.search) {
      qs.set('search', params.search)
    }
    const query = qs.toString()
    const res = await fetchWithAuth(
      `${apiUrl}${TEAM_ROUTES.directory}${query ? `?${query}` : ''}`,
    )
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        i18n.t('team:recruitmentApi.operations.loadDirectory'),
      )
    }
    return res.json()
  },

  apply: async (teamId: string): Promise<MyJoinRequest> => {
    const res = await fetchWithAuth(
      `${apiUrl}${TEAM_ROUTES.joinRequests(teamId)}`,
      { method: 'POST' },
    )
    if (!res.ok) {
      handleHttpError(
        res,
        {
          409: {
            title: i18n.t('team:recruitmentApi.applyImpossibleTitle'),
            message: i18n.t('team:recruitmentApi.applyImpossibleMessage'),
          },
          404: {
            title: i18n.t('team:recruitmentApi.teamNotFoundTitle'),
            message: i18n.t('team:recruitmentApi.teamNotFoundMessage'),
          },
        },
        i18n.t('team:recruitmentApi.operations.applyToTeam'),
      )
    }
    return res.json()
  },

  cancel: async (teamId: string): Promise<void> => {
    const res = await fetchWithAuth(
      `${apiUrl}${TEAM_ROUTES.myJoinRequest(teamId)}`,
      { method: 'DELETE' },
    )
    if (!res.ok) {
      handleHttpError(
        res,
        {
          404: {
            title: i18n.t('team:recruitmentApi.requestNotFoundTitle'),
            message: i18n.t(
              'team:recruitmentApi.requestNotFoundNoPendingMessage',
            ),
          },
        },
        i18n.t('team:recruitmentApi.operations.cancelApplication'),
      )
    }
  },

  getMine: async (): Promise<{ requests: MyJoinRequest[] }> => {
    const res = await fetchWithAuth(`${apiUrl}${TEAM_ROUTES.myJoinRequests}`)
    if (!res.ok) {
      handleHttpError(
        res,
        {},
        i18n.t('team:recruitmentApi.operations.loadMyApplications'),
      )
    }
    return res.json()
  },

  getForTeam: async (
    teamId: string,
  ): Promise<{ requests: TeamJoinRequest[] }> => {
    const res = await fetchWithAuth(
      `${apiUrl}${TEAM_ROUTES.joinRequests(teamId)}`,
    )
    if (!res.ok) {
      handleHttpError(
        res,
        {
          403: {
            title: i18n.t('team:recruitmentApi.actionNotAllowedTitle'),
            message: i18n.t(
              'team:recruitmentApi.onlyOfficersSeeRequestsMessage',
            ),
          },
        },
        i18n.t('team:recruitmentApi.operations.loadTeamApplications'),
      )
    }
    return res.json()
  },

  accept: async (
    requestId: string,
  ): Promise<{ teamId: string; userId: string }> => {
    const res = await fetchWithAuth(
      `${apiUrl}${TEAM_ROUTES.acceptJoinRequest(requestId)}`,
      { method: 'POST' },
    )
    if (!res.ok) {
      handleHttpError(
        res,
        {
          403: {
            title: i18n.t('team:recruitmentApi.actionNotAllowedTitle'),
            message: i18n.t('team:recruitmentApi.noRightsToProcessMessage'),
          },
          404: {
            title: i18n.t('team:recruitmentApi.requestNotFoundTitle'),
            message: i18n.t('team:recruitmentApi.requestNoLongerExistsMessage'),
          },
          409: {
            title: i18n.t('team:recruitmentApi.acceptImpossibleTitle'),
            message: i18n.t('team:recruitmentApi.acceptImpossibleMessage'),
          },
        },
        i18n.t('team:recruitmentApi.operations.acceptApplication'),
      )
    }
    return res.json()
  },

  decline: async (
    requestId: string,
  ): Promise<{ teamId: string; userId: string }> => {
    const res = await fetchWithAuth(
      `${apiUrl}${TEAM_ROUTES.declineJoinRequest(requestId)}`,
      { method: 'POST' },
    )
    if (!res.ok) {
      handleHttpError(
        res,
        {
          404: {
            title: i18n.t('team:recruitmentApi.requestNotFoundTitle'),
            message: i18n.t('team:recruitmentApi.requestNoLongerExistsMessage'),
          },
          409: {
            title: i18n.t('team:recruitmentApi.alreadyProcessedTitle'),
            message: i18n.t('team:recruitmentApi.alreadyProcessedMessage'),
          },
        },
        i18n.t('team:recruitmentApi.operations.declineApplication'),
      )
    }
    return res.json()
  },
}

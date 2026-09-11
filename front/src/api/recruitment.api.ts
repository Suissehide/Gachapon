import { apiUrl } from '../constants/config.constant.ts'
import type {
  DirectoryTeam,
  MyJoinRequest,
  TeamJoinRequest,
} from '../constants/teams.constant.ts'
import { TEAM_ROUTES } from '../constants/teams.constant.ts'
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
      handleHttpError(res, {}, "Chargement de l'annuaire")
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
            title: 'Candidature impossible',
            message:
              'Tu as déjà candidaté à cette équipe, tu es en cooldown après un refus récent, ou tu as atteint tes 5 candidatures en attente.',
          },
          404: {
            title: 'Équipe introuvable',
            message: "Cette équipe n'existe pas ou a été supprimée.",
          },
        },
        'Envoi de la candidature',
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
            title: 'Candidature introuvable',
            message: "Tu n'as pas de candidature en attente pour cette équipe.",
          },
        },
        'Annulation de la candidature',
      )
    }
  },

  getMine: async (): Promise<{ requests: MyJoinRequest[] }> => {
    const res = await fetchWithAuth(`${apiUrl}${TEAM_ROUTES.myJoinRequests}`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Chargement de tes candidatures')
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
            title: 'Action non autorisée',
            message: 'Seuls le chef et les officiers voient les candidatures.',
          },
        },
        'Chargement des candidatures',
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
            title: 'Acceptation impossible',
            message:
              "L'équipe est complète, ou ce candidat a atteint sa limite de 3 équipes.",
          },
          404: {
            title: 'Candidature introuvable',
            message: "Cette candidature n'existe plus.",
          },
          409: {
            title: 'Déjà traitée',
            message: 'Cette candidature a déjà été acceptée ou refusée.',
          },
        },
        'Acceptation de la candidature',
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
            title: 'Candidature introuvable',
            message: "Cette candidature n'existe plus.",
          },
          409: {
            title: 'Déjà traitée',
            message: 'Cette candidature a déjà été acceptée ou refusée.',
          },
        },
        'Refus de la candidature',
      )
    }
    return res.json()
  },
}

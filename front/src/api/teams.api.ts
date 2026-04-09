import { apiUrl } from '../constants/config.constant.ts'
import type {
  Invitation,
  MyInvitation,
  RankedMember,
  Team,
  TeamInvitation,
  TeamMember,
  TeamRankingPage,
  TeamSummary,
} from '../constants/teams.constant.ts'
import { TEAM_ROUTES } from '../constants/teams.constant.ts'
import { USER_ROUTES } from '../constants/user.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type {
  TeamMember,
  Team,
  TeamSummary,
  Invitation,
  MyInvitation,
  TeamInvitation,
  RankedMember,
  TeamRankingPage,
}

export const TeamsApi = {
  getMyTeams: async (): Promise<{ teams: TeamSummary[] }> => {
    const res = await fetchWithAuth(`${apiUrl}${TEAM_ROUTES.teams}`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération des équipes')
    }
    return res.json()
  },

  getTeam: async (teamId: string): Promise<Team> => {
    const res = await fetchWithAuth(`${apiUrl}${TEAM_ROUTES.team(teamId)}`)
    if (!res.ok) {
      handleHttpError(res, {}, "Erreur lors de la récupération de l'équipe")
    }
    return res.json()
  },

  createTeam: async (data: {
    name: string
    description?: string
  }): Promise<Team> => {
    const res = await fetchWithAuth(`${apiUrl}${TEAM_ROUTES.teams}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      handleHttpError(res, {}, "Erreur lors de la création de l'équipe")
    }
    return res.json()
  },

  updateTeam: async (
    teamId: string,
    data: { name: string; description?: string },
  ): Promise<Team> => {
    const res = await fetchWithAuth(`${apiUrl}${TEAM_ROUTES.team(teamId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      handleHttpError(res, {}, "Erreur lors de la mise à jour de l'équipe")
    }
    return res.json()
  },

  deleteTeam: async (teamId: string): Promise<void> => {
    const res = await fetchWithAuth(`${apiUrl}${TEAM_ROUTES.team(teamId)}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      handleHttpError(res, {}, "Erreur lors de la suppression de l'équipe")
    }
  },

  inviteMember: async (
    teamId: string,
    data: { username?: string; email?: string },
  ): Promise<Invitation> => {
    const res = await fetchWithAuth(`${apiUrl}${TEAM_ROUTES.invite(teamId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      handleHttpError(res, {}, "Erreur lors de l'invitation")
    }
    return res.json()
  },

  removeMember: async (teamId: string, userId: string): Promise<void> => {
    const res = await fetchWithAuth(
      `${apiUrl}${TEAM_ROUTES.removeMember(teamId, userId)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
    )
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la suppression du membre')
    }
  },

  leaveTeam: async (teamId: string): Promise<void> => {
    const res = await fetchWithAuth(`${apiUrl}${TEAM_ROUTES.leave(teamId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      handleHttpError(res, {}, "Erreur lors du départ de l'équipe")
    }
  },

  getMyInvitations: async (): Promise<{ invitations: MyInvitation[] }> => {
    const res = await fetchWithAuth(`${apiUrl}${TEAM_ROUTES.myInvitations}`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors du chargement des invitations')
    }
    return res.json()
  },

  getInvitation: async (token: string): Promise<Invitation> => {
    const res = await fetchWithAuth(`${apiUrl}${TEAM_ROUTES.invitation(token)}`)
    if (!res.ok) {
      handleHttpError(res, {}, "Erreur lors de la récupération de l'invitation")
    }
    return res.json()
  },

  acceptInvitation: async (token: string): Promise<{ accepted: boolean }> => {
    const res = await fetchWithAuth(
      `${apiUrl}${TEAM_ROUTES.acceptInvitation(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
    )
    if (!res.ok) {
      handleHttpError(res, {}, "Erreur lors de l'acceptation de l'invitation")
    }
    return res.json()
  },

  declineInvitation: async (token: string): Promise<{ declined: boolean }> => {
    const res = await fetchWithAuth(
      `${apiUrl}${TEAM_ROUTES.declineInvitation(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
    )
    if (!res.ok) {
      handleHttpError(res, {}, "Erreur lors du refus de l'invitation")
    }
    return res.json()
  },

  getTeamRanking: async (
    teamId: string,
    page: number,
    limit = 20,
  ): Promise<TeamRankingPage> => {
    const res = await fetchWithAuth(
      `${apiUrl}${TEAM_ROUTES.ranking(teamId, page, limit)}`,
    )
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération du classement')
    }
    return res.json()
  },

  getTeamInvitations: async (
    teamId: string,
  ): Promise<{ invitations: TeamInvitation[] }> => {
    const res = await fetchWithAuth(
      `${apiUrl}${TEAM_ROUTES.invitations(teamId)}`,
    )
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors du chargement des invitations')
    }
    return res.json()
  },

  resendInvitation: async (token: string): Promise<void> => {
    const res = await fetchWithAuth(
      `${apiUrl}${TEAM_ROUTES.resendInvitation(token)}`,
      {
        method: 'POST',
      },
    )
    if (!res.ok) {
      handleHttpError(
        res,
        {
          429: {
            title: 'Trop tôt',
            message: 'Attends 5 minutes avant de renvoyer.',
          },
        },
        'Erreur lors du renvoi',
      )
    }
  },

  cancelInvitation: async (token: string): Promise<void> => {
    const res = await fetchWithAuth(
      `${apiUrl}${TEAM_ROUTES.cancelInvitation(token)}`,
      {
        method: 'POST',
      },
    )
    if (!res.ok) {
      handleHttpError(
        res,
        {
          409: {
            title: 'Impossible',
            message: "L'invitation n'est plus en attente.",
          },
        },
        "Erreur lors de l'annulation",
      )
    }
  },

  deleteInvitation: async (id: string): Promise<void> => {
    const res = await fetchWithAuth(
      `${apiUrl}${TEAM_ROUTES.invitationById(id)}`,
      {
        method: 'DELETE',
      },
    )
    if (!res.ok) {
      handleHttpError(
        res,
        {
          409: {
            title: 'Impossible',
            message: "Annulez d'abord l'invitation.",
          },
        },
        'Erreur lors de la suppression',
      )
    }
  },

  searchUsers: async (
    q: string,
  ): Promise<{
    users: { id: string; username: string; avatar: string | null }[]
  }> => {
    const res = await fetchWithAuth(`${apiUrl}${USER_ROUTES.search(q)}`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la recherche')
    }
    return res.json()
  },
}

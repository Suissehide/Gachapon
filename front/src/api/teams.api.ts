import { apiUrl } from '../constants/config.constant.ts'
import type {
  Invitation,
  MyInvitation,
  Team,
  TeamInvitation,
  TeamMember,
  TeamSummary,
} from '../constants/teams.constant.ts'
import { TEAM_ROUTES } from '../constants/teams.constant.ts'
import { USER_ROUTES } from '../constants/user.constant.ts'
import i18n from '../i18n/index.ts'
import { handleHttpErrorFromServer } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type {
  TeamMember,
  Team,
  TeamSummary,
  Invitation,
  MyInvitation,
  TeamInvitation,
}

/**
 * Les messages détaillés de ce fichier doublonnaient le catalogue d'erreurs
 * du back (`back/src/main/infra/i18n/error-messages/`, domaine `team.*`) —
 * une traduction manuelle maintenue en parallèle d'un catalogue déjà
 * bilingue, condamnée à diverger. `handleHttpErrorFromServer` lit le
 * `message` que le serveur a déjà résolu dans la langue de la requête (voir
 * `withAcceptLanguage` dans `i18n/index.ts`) ; les TITRES de toast, qui
 * n'ont pas d'équivalent côté back, restent traduits ici — ET les 400,
 * partagés avec la validation Zod (voir la note sur chaque site)
 * (`team:apiTitles.*`, voir task-6-report.md).
 */
export const TeamsApi = {
  getMyTeams: async (): Promise<{ teams: TeamSummary[] }> => {
    const res = await fetchWithAuth(`${apiUrl}${TEAM_ROUTES.teams}`)
    if (!res.ok) {
      await handleHttpErrorFromServer(
        res,
        { 404: i18n.t('team:apiTitles.teamsNotFound') },
        i18n.t('team:apiTitles.operations.loadTeams'),
      )
    }
    return res.json()
  },

  getTeam: async (teamId: string): Promise<Team> => {
    const res = await fetchWithAuth(`${apiUrl}${TEAM_ROUTES.team(teamId)}`)
    if (!res.ok) {
      await handleHttpErrorFromServer(
        res,
        {
          404: i18n.t('team:apiTitles.teamNotFound'),
          403: i18n.t('team:apiTitles.accessDenied'),
        },
        i18n.t('team:apiTitles.operations.loadTeam'),
      )
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
      await handleHttpErrorFromServer(
        res,
        {
          400: {
            title: i18n.t('team:apiTitles.invalidName'),
            message: i18n.t('team:apiTitles.invalidNameMessage'),
          },
          409: i18n.t('team:apiTitles.nameTaken'),
        },
        i18n.t('team:apiTitles.operations.createTeam'),
      )
    }
    return res.json()
  },

  updateTeam: async (
    teamId: string,
    data: { name: string; description?: string; recruiting?: boolean },
  ): Promise<Team> => {
    const res = await fetchWithAuth(`${apiUrl}${TEAM_ROUTES.team(teamId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      await handleHttpErrorFromServer(
        res,
        {
          400: {
            title: i18n.t('team:apiTitles.invalidData'),
            message: i18n.t('team:apiTitles.invalidDataMessage'),
          },
          403: i18n.t('team:apiTitles.actionNotAllowed'),
          409: i18n.t('team:apiTitles.nameTaken'),
        },
        i18n.t('team:apiTitles.operations.updateTeam'),
      )
    }
    return res.json()
  },

  deleteTeam: async (teamId: string): Promise<void> => {
    const res = await fetchWithAuth(`${apiUrl}${TEAM_ROUTES.team(teamId)}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      await handleHttpErrorFromServer(
        res,
        {
          403: i18n.t('team:apiTitles.actionNotAllowed'),
          404: i18n.t('team:apiTitles.teamNotFound'),
        },
        i18n.t('team:apiTitles.operations.deleteTeam'),
      )
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
      await handleHttpErrorFromServer(
        res,
        {
          400: {
            title: i18n.t('team:apiTitles.userNotFound'),
            message: i18n.t('team:apiTitles.userNotFoundMessage'),
          },
          403: i18n.t('team:apiTitles.actionNotAllowed'),
          404: i18n.t('team:apiTitles.userNotFound'),
          409: i18n.t('team:apiTitles.alreadyInvited'),
        },
        i18n.t('team:apiTitles.operations.invite'),
      )
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
      await handleHttpErrorFromServer(
        res,
        {
          403: i18n.t('team:apiTitles.actionNotAllowed'),
          404: i18n.t('team:apiTitles.memberNotFound'),
        },
        i18n.t('team:apiTitles.operations.removeMember'),
      )
    }
  },

  /**
   * Promotion/rétrogradation. Le back n'accepte que `ADMIN` et `MEMBER` —
   * passer le rôle de chef est une AUTRE route (`transferOwnership`), qui
   * déplace aussi la propriété de l'équipe.
   */
  changeMemberRole: async (
    teamId: string,
    userId: string,
    role: 'ADMIN' | 'MEMBER',
  ): Promise<void> => {
    const res = await fetchWithAuth(
      `${apiUrl}${TEAM_ROUTES.memberRole(teamId, userId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      },
    )
    if (!res.ok) {
      await handleHttpErrorFromServer(
        res,
        {
          403: i18n.t('team:apiTitles.actionNotAllowed'),
          404: i18n.t('team:apiTitles.memberNotFound'),
        },
        i18n.t('team:apiTitles.operations.changeRole'),
      )
    }
  },

  transferOwnership: async (
    teamId: string,
    newOwnerId: string,
  ): Promise<void> => {
    const res = await fetchWithAuth(
      `${apiUrl}${TEAM_ROUTES.transfer(teamId)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOwnerId }),
      },
    )
    if (!res.ok) {
      await handleHttpErrorFromServer(
        res,
        {
          403: i18n.t('team:apiTitles.actionNotAllowed'),
          404: i18n.t('team:apiTitles.memberNotFound'),
        },
        i18n.t('team:apiTitles.operations.transferOwnership'),
      )
    }
  },

  leaveTeam: async (teamId: string): Promise<void> => {
    const res = await fetchWithAuth(`${apiUrl}${TEAM_ROUTES.leave(teamId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      await handleHttpErrorFromServer(
        res,
        {
          403: i18n.t('team:apiTitles.cannotLeave'),
          404: i18n.t('team:apiTitles.teamNotFound'),
        },
        i18n.t('team:apiTitles.operations.leaveTeam'),
      )
    }
  },

  getMyInvitations: async (): Promise<{ invitations: MyInvitation[] }> => {
    const res = await fetchWithAuth(`${apiUrl}${TEAM_ROUTES.myInvitations}`)
    if (!res.ok) {
      await handleHttpErrorFromServer(
        res,
        {},
        i18n.t('team:apiTitles.operations.loadInvitations'),
      )
    }
    return res.json()
  },

  getInvitation: async (token: string): Promise<Invitation> => {
    const res = await fetchWithAuth(`${apiUrl}${TEAM_ROUTES.invitation(token)}`)
    if (!res.ok) {
      await handleHttpErrorFromServer(
        res,
        {
          // 403 = le lien est valide, mais il vise un autre compte. Le
          // distinguer du 404 est ce qui permet à la page de proposer un
          // changement de compte plutôt qu'un « lien invalide » trompeur.
          403: i18n.t('team:apiTitles.invitationForOtherAccount'),
          404: i18n.t('team:apiTitles.invitationNotFound'),
          410: i18n.t('team:apiTitles.invitationExpired'),
        },
        i18n.t('team:apiTitles.operations.loadInvitation'),
      )
    }
    return res.json()
  },

  acceptInvitation: async (token: string): Promise<{ accepted: boolean }> => {
    const res = await fetchWithAuth(
      `${apiUrl}${TEAM_ROUTES.acceptInvitation(token)}`,
      {
        method: 'POST',
      },
    )
    if (!res.ok) {
      await handleHttpErrorFromServer(
        res,
        {
          404: i18n.t('team:apiTitles.invitationNotFound'),
          409: i18n.t('team:apiTitles.alreadyMember'),
          410: i18n.t('team:apiTitles.invitationExpired'),
        },
        i18n.t('team:apiTitles.operations.acceptInvitation'),
      )
    }
    return res.json()
  },

  declineInvitation: async (token: string): Promise<{ declined: boolean }> => {
    const res = await fetchWithAuth(
      `${apiUrl}${TEAM_ROUTES.declineInvitation(token)}`,
      {
        method: 'POST',
      },
    )
    if (!res.ok) {
      await handleHttpErrorFromServer(
        res,
        {
          404: i18n.t('team:apiTitles.invitationNotFound'),
          409: i18n.t('team:apiTitles.alreadyProcessed'),
        },
        i18n.t('team:apiTitles.operations.declineInvitation'),
      )
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
      await handleHttpErrorFromServer(
        res,
        {},
        i18n.t('team:apiTitles.operations.loadTeamInvitations'),
      )
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
      await handleHttpErrorFromServer(
        res,
        { 429: i18n.t('team:apiTitles.tooSoon') },
        i18n.t('team:apiTitles.operations.resendInvitation'),
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
      await handleHttpErrorFromServer(
        res,
        { 409: i18n.t('team:apiTitles.impossible') },
        i18n.t('team:apiTitles.operations.cancelInvitation'),
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
      await handleHttpErrorFromServer(
        res,
        { 409: i18n.t('team:apiTitles.impossible') },
        i18n.t('team:apiTitles.operations.deleteInvitation'),
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
      await handleHttpErrorFromServer(
        res,
        {
          400: {
            title: i18n.t('team:apiTitles.invalidSearch'),
            message: i18n.t('team:apiTitles.invalidSearchMessage'),
          },
        },
        i18n.t('team:apiTitles.operations.searchUsers'),
      )
    }
    return res.json()
  },
}

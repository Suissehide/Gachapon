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
      handleHttpError(
        res,
        {
          404: {
            title: 'Équipes introuvables',
            message: 'Impossible de charger tes équipes.',
          },
        },
        'Chargement des équipes',
      )
    }
    return res.json()
  },

  getTeam: async (teamId: string): Promise<Team> => {
    const res = await fetchWithAuth(`${apiUrl}${TEAM_ROUTES.team(teamId)}`)
    if (!res.ok) {
      handleHttpError(
        res,
        {
          404: {
            title: 'Équipe introuvable',
            message: "Cette équipe n'existe pas ou a été supprimée.",
          },
          403: {
            title: 'Accès refusé',
            message: "Tu ne fais pas partie de cette équipe.",
          },
        },
        "Chargement de l'équipe",
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
      handleHttpError(
        res,
        {
          400: {
            title: 'Nom invalide',
            message: 'Vérifie le nom de ton équipe.',
          },
          409: {
            title: 'Nom déjà pris',
            message: 'Une équipe avec ce nom existe déjà.',
          },
        },
        "Création de l'équipe",
      )
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
      handleHttpError(
        res,
        {
          400: {
            title: 'Données invalides',
            message: 'Vérifie les informations saisies.',
          },
          403: {
            title: 'Action non autorisée',
            message: "Seul le créateur peut modifier l'équipe.",
          },
          409: {
            title: 'Nom déjà pris',
            message: 'Une équipe avec ce nom existe déjà.',
          },
        },
        "Modification de l'équipe",
      )
    }
    return res.json()
  },

  deleteTeam: async (teamId: string): Promise<void> => {
    const res = await fetchWithAuth(`${apiUrl}${TEAM_ROUTES.team(teamId)}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      handleHttpError(
        res,
        {
          403: {
            title: 'Action non autorisée',
            message: "Seul le créateur peut supprimer l'équipe.",
          },
          404: {
            title: 'Équipe introuvable',
            message: "Cette équipe n'existe plus.",
          },
        },
        "Suppression de l'équipe",
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
      handleHttpError(
        res,
        {
          400: {
            title: 'Utilisateur introuvable',
            message: "Aucun compte ne correspond à cette recherche.",
          },
          403: {
            title: 'Action non autorisée',
            message: "Tu n'as pas la permission d'inviter des membres.",
          },
          404: {
            title: 'Utilisateur introuvable',
            message: "Aucun compte ne correspond à ce nom d'utilisateur.",
          },
          409: {
            title: 'Déjà invité',
            message: 'Cette personne a déjà une invitation en attente ou fait déjà partie de l\'équipe.',
          },
        },
        'Invitation',
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
      handleHttpError(
        res,
        {
          403: {
            title: 'Action non autorisée',
            message: 'Seul le créateur peut exclure des membres.',
          },
          404: {
            title: 'Membre introuvable',
            message: "Ce membre ne fait plus partie de l'équipe.",
          },
        },
        'Exclusion du membre',
      )
    }
  },

  leaveTeam: async (teamId: string): Promise<void> => {
    const res = await fetchWithAuth(`${apiUrl}${TEAM_ROUTES.leave(teamId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      handleHttpError(
        res,
        {
          403: {
            title: 'Impossible de quitter',
            message: "Le créateur ne peut pas quitter son équipe. Supprime-la à la place.",
          },
          404: {
            title: 'Équipe introuvable',
            message: "Cette équipe n'existe plus.",
          },
        },
        "Départ de l'équipe",
      )
    }
  },

  getMyInvitations: async (): Promise<{ invitations: MyInvitation[] }> => {
    const res = await fetchWithAuth(`${apiUrl}${TEAM_ROUTES.myInvitations}`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Chargement des invitations')
    }
    return res.json()
  },

  getInvitation: async (token: string): Promise<Invitation> => {
    const res = await fetchWithAuth(`${apiUrl}${TEAM_ROUTES.invitation(token)}`)
    if (!res.ok) {
      handleHttpError(
        res,
        {
          404: {
            title: 'Invitation introuvable',
            message: "Ce lien d'invitation est invalide ou a expiré.",
          },
          410: {
            title: 'Invitation expirée',
            message: "Cette invitation n'est plus valide.",
          },
        },
        "Chargement de l'invitation",
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
      handleHttpError(
        res,
        {
          404: {
            title: 'Invitation introuvable',
            message: "Ce lien d'invitation est invalide ou a expiré.",
          },
          409: {
            title: 'Déjà membre',
            message: 'Tu fais déjà partie de cette équipe.',
          },
          410: {
            title: 'Invitation expirée',
            message: "Cette invitation n'est plus valide.",
          },
        },
        "Acceptation de l'invitation",
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
      handleHttpError(
        res,
        {
          404: {
            title: 'Invitation introuvable',
            message: "Cette invitation n'existe plus.",
          },
          409: {
            title: 'Déjà traitée',
            message: 'Cette invitation a déjà été acceptée ou refusée.',
          },
        },
        "Refus de l'invitation",
      )
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
      handleHttpError(
        res,
        {
          400: {
            title: 'Recherche invalide',
            message: 'Le terme de recherche est trop court ou invalide.',
          },
        },
        'Recherche d\'utilisateurs',
      )
    }
    return res.json()
  },
}

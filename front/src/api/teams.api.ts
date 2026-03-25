import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

export type TeamMember = {
  id: string
  userId: string
  role: 'MEMBER' | 'ADMIN' | 'OWNER'
  joinedAt: string
  user: { id: string; username: string; avatar: string | null }
}

export type Team = {
  id: string
  name: string
  slug: string
  description: string | null
  avatar: string | null
  ownerId: string
  createdAt: string
  members: TeamMember[]
}

export type TeamSummary = Team & { memberCount: number }

export type Invitation = {
  id: string
  token: string
  teamId: string
  status: string
  expiresAt: string
}

export type RankedMember = {
  rank: number
  user: { id: string; username: string; avatar: string | null }
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  score: number
}

export type TeamRankingPage = {
  members: RankedMember[]
  total: number
  page: number
  totalPages: number
}

export const TeamsApi = {
  getMyTeams: async (): Promise<{ teams: TeamSummary[] }> => {
    const res = await fetchWithAuth(`${apiUrl}/teams`)
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération des équipes')
    }
    return res.json()
  },

  getTeam: async (teamId: string): Promise<Team> => {
    const res = await fetchWithAuth(`${apiUrl}/teams/${teamId}`)
    if (!res.ok) {
      handleHttpError(res, {}, "Erreur lors de la récupération de l'équipe")
    }
    return res.json()
  },

  createTeam: async (data: {
    name: string
    description?: string
  }): Promise<Team> => {
    const res = await fetchWithAuth(`${apiUrl}/teams`, {
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
    const res = await fetchWithAuth(`${apiUrl}/teams/${teamId}`, {
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
    const res = await fetchWithAuth(`${apiUrl}/teams/${teamId}`, {
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
    const res = await fetchWithAuth(`${apiUrl}/teams/${teamId}/invite`, {
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
      `${apiUrl}/teams/${teamId}/members/${userId}/remove`,
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
    const res = await fetchWithAuth(`${apiUrl}/teams/${teamId}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      handleHttpError(res, {}, "Erreur lors du départ de l'équipe")
    }
  },

  getInvitation: async (token: string): Promise<Invitation> => {
    const res = await fetchWithAuth(`${apiUrl}/invitations/${token}`)
    if (!res.ok) {
      handleHttpError(res, {}, "Erreur lors de la récupération de l'invitation")
    }
    return res.json()
  },

  acceptInvitation: async (token: string): Promise<{ accepted: boolean }> => {
    const res = await fetchWithAuth(`${apiUrl}/invitations/${token}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      handleHttpError(res, {}, "Erreur lors de l'acceptation de l'invitation")
    }
    return res.json()
  },

  declineInvitation: async (token: string): Promise<{ declined: boolean }> => {
    const res = await fetchWithAuth(`${apiUrl}/invitations/${token}/decline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
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
      `${apiUrl}/teams/${teamId}/ranking?page=${page}&limit=${limit}`,
    )
    if (!res.ok) {
      handleHttpError(res, {}, 'Erreur lors de la récupération du classement')
    }
    return res.json()
  },
}

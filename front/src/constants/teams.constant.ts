// Types
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

export type TeamInvitation = {
  id: string
  token: string
  invitedEmail: string | null
  invitedUsername: string | null
  createdAt: string
  emailSentAt: string | null
  status: 'PENDING' | 'EXPIRED' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED'
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

// Routes
export const TEAM_ROUTES = {
  teams: '/teams',
  team: (teamId: string) => `/teams/${teamId}`,
  invite: (teamId: string) => `/teams/${teamId}/invite`,
  leave: (teamId: string) => `/teams/${teamId}/leave`,
  ranking: (teamId: string, page: number, limit: number) =>
    `/teams/${teamId}/ranking?page=${page}&limit=${limit}`,
  invitations: (teamId: string) => `/teams/${teamId}/invitations`,
  removeMember: (teamId: string, userId: string) =>
    `/teams/${teamId}/members/${userId}/remove`,
  invitation: (token: string) => `/invitations/${token}`,
  invitationById: (id: string) => `/invitations/${id}`,
  acceptInvitation: (token: string) => `/invitations/${token}/accept`,
  declineInvitation: (token: string) => `/invitations/${token}/decline`,
  resendInvitation: (token: string) => `/invitations/${token}/resend`,
  cancelInvitation: (token: string) => `/invitations/${token}/cancel`,
} as const

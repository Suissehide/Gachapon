/**
 * Emplacements d'équipe par joueur. Constante de domaine côté serveur
 * (`MAX_TEAMS_PER_USER` dans `team.domain.ts`), jamais exposée par
 * `/economy/config` : ce n'est donc pas une valeur à charger, mais elle doit
 * vivre à UN seul endroit côté front plutôt que dans chaque écran qui la lit.
 */
export const TEAM_SLOTS = 3

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

export type TeamRaidBadge = {
  bossName: string
  pct: number
}

// Croisé champ par champ avec l'entrée `teams[]` de `teamListResponseSchema`
// (back/src/main/interfaces/http/fastify/schemas/teams.schema.ts). GET
// /teams ne renvoie PAS `members` — le back a arrêté de l'envoyer parce que
// rien ne le lisait — donc ce type ne doit surtout pas étendre `Team`, qui
// le porte. Pas de champ « tag » ([DLC]…) non plus : la maquette en montre
// un, mais rien côté serveur ne le produit.
export type TeamSummary = {
  id: string
  name: string
  slug: string
  description: string | null
  avatar: string | null
  ownerId: string
  createdAt: string
  level: number
  hue: number
  memberCount: number
  maxMembers: number
  myRole: 'OWNER' | 'ADMIN' | 'MEMBER'
  myRoleLabel: 'Chef' | 'Officier' | 'Membre' | 'Recrue'
  raid: TeamRaidBadge | null
}

export type Invitation = {
  id: string
  token: string
  teamId: string
  status: 'PENDING' | 'EXPIRED' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED'
  expiresAt: string
  team?: { id: string; name: string; slug: string; avatar: string | null }
  invitedBy?: { id: string; username: string; avatar: string | null } | null
}

export type MyInvitation = {
  id: string
  token: string
  teamId: string
  status: 'PENDING'
  expiresAt: string
  createdAt: string
  team: { id: string; name: string; slug: string; avatar: string | null }
  invitedBy: { id: string; username: string; avatar: string | null } | null
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
  myInvitations: '/me/invitations',
  removeMember: (teamId: string, userId: string) =>
    `/teams/${teamId}/members/${userId}/remove`,
  invitation: (token: string) => `/invitations/${token}`,
  invitationById: (id: string) => `/invitations/${id}`,
  acceptInvitation: (token: string) => `/invitations/${token}/accept`,
  declineInvitation: (token: string) => `/invitations/${token}/decline`,
  resendInvitation: (token: string) => `/invitations/${token}/resend`,
  cancelInvitation: (token: string) => `/invitations/${token}/cancel`,
  members: (teamId: string) => `/teams/${teamId}/members`,
  raids: (teamId: string) => `/teams/${teamId}/raids`,
  perks: (teamId: string) => `/teams/${teamId}/perks`,
  perksReset: (teamId: string) => `/teams/${teamId}/perks/reset`,
} as const

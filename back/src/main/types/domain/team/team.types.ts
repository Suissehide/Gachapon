export type TeamMemberRole = 'MEMBER' | 'ADMIN' | 'OWNER'
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED'

export type TeamMemberEntity = {
  id: string
  teamId: string
  userId: string
  role: TeamMemberRole
  joinedAt: Date
  user?: { id: string; username: string; avatar: string | null }
}

export type TeamEntity = {
  id: string
  name: string
  slug: string
  description: string | null
  avatar: string | null
  ownerId: string
  createdAt: Date
  updatedAt: Date
}

export type TeamWithMembers = TeamEntity & {
  members: TeamMemberEntity[]
}

export type TeamSummary = TeamEntity & {
  _count: { members: number }
}

export type InvitationEntity = {
  id: string
  teamId: string
  token: string
  invitedById: string | null
  invitedUserId: string | null
  invitedEmail: string | null
  status: InvitationStatus
  expiresAt: Date
  createdAt: Date
}

import type { InvitationEntity, TeamSummary, TeamWithMembers } from './team.types'

export interface TeamDomainInterface {
  createTeam(ownerId: string, data: { name: string; description?: string }): Promise<TeamWithMembers>
  inviteMember(
    teamId: string,
    actorId: string,
    target: { email?: string; username?: string },
  ): Promise<InvitationEntity>
  acceptInvitation(token: string, userId: string): Promise<void>
  declineInvitation(token: string, userId: string): Promise<void>
  removeMember(teamId: string, actorId: string, targetUserId: string): Promise<void>
  leaveTeam(teamId: string, userId: string): Promise<void>
  transferOwnership(teamId: string, ownerId: string, newOwnerId: string): Promise<void>
  deleteTeam(teamId: string, userId: string): Promise<void>
  getMyTeams(userId: string): Promise<TeamSummary[]>
  getTeam(teamId: string, userId: string): Promise<TeamWithMembers>
}

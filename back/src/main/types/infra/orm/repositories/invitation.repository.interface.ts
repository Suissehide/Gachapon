import type { InvitationEntity } from '../../../domain/team/team.types'

export interface IInvitationRepository {
  findByToken(token: string): Promise<InvitationEntity | null>
  findPendingByTeamAndUser(
    teamId: string,
    userId: string,
  ): Promise<InvitationEntity | null>
  findPendingByTeamAndEmail(
    teamId: string,
    email: string,
  ): Promise<InvitationEntity | null>
  create(data: {
    teamId: string
    invitedById?: string
    invitedUserId?: string
    invitedEmail?: string
    expiresAt: Date
  }): Promise<InvitationEntity>
  updateStatus(id: string, status: 'ACCEPTED' | 'DECLINED' | 'CANCELLED'): Promise<void>
  findPendingByTeam(teamId: string): Promise<(InvitationEntity & {
    invitedUser: { username: string } | null
  })[]>
  updateEmailSentAt(id: string, sentAt: Date): Promise<void>
  findById(id: string): Promise<InvitationEntity | null>
  findAllByTeam(teamId: string): Promise<(InvitationEntity & {
    invitedUser: { username: string } | null
  })[]>
  cancelById(id: string): Promise<void>
  deleteById(id: string): Promise<void>
}

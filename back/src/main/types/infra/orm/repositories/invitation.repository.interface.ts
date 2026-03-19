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
  updateStatus(id: string, status: 'ACCEPTED' | 'DECLINED'): Promise<void>
}

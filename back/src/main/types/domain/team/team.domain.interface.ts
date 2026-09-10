import type { RaidHistoryEntry } from '../raid/raid.domain.interface'
import type {
  InvitationEntity,
  TeamDetail,
  TeamListItem,
  TeamMembersView,
  TeamWithMembers,
} from './team.types'

export interface TeamDomainInterface {
  createTeam(
    ownerId: string,
    data: { name: string; description?: string },
  ): Promise<TeamWithMembers>
  inviteMember(
    teamId: string,
    actorId: string,
    target: { email?: string; username?: string },
  ): Promise<InvitationEntity>
  acceptInvitation(token: string, userId: string): Promise<void>
  declineInvitation(token: string, userId: string): Promise<void>
  removeMember(
    teamId: string,
    actorId: string,
    targetUserId: string,
  ): Promise<void>
  leaveTeam(teamId: string, userId: string): Promise<void>
  transferOwnership(
    teamId: string,
    ownerId: string,
    newOwnerId: string,
  ): Promise<void>
  updateTeam(
    teamId: string,
    userId: string,
    data: { name: string; description?: string },
  ): Promise<TeamWithMembers>
  deleteTeam(teamId: string, userId: string): Promise<void>
  /** Un invité en attente y a droit : c'est un aperçu, pas le roster. */
  getTeam(teamId: string, userId: string): Promise<TeamWithMembers>
  /**
   * Appartenance STRICTE : tout ce qui expose les MEMBRES (roster, historique
   * de raid, classement interne) passe par là, jamais par `getTeam`.
   */
  getTeamAsMember(teamId: string, userId: string): Promise<TeamWithMembers>
  /** La liste « Mes équipes », raid de la semaine compris. */
  listMyTeams(userId: string, now?: Date): Promise<TeamListItem[]>
  /** L'en-tête de la fiche d'équipe. */
  getTeamDetail(teamId: string, userId: string, now?: Date): Promise<TeamDetail>
  /** La table des membres — MEMBRES uniquement, pas les invités en attente. */
  listMembers(
    teamId: string,
    userId: string,
    now?: Date,
  ): Promise<TeamMembersView>
  /** Les semaines de raid révolues, plus récentes d'abord. Membres seuls. */
  listRaidHistory(
    teamId: string,
    userId: string,
    now?: Date,
  ): Promise<RaidHistoryEntry[]>
  resendInvitationEmail(token: string, actorId: string): Promise<void>
}

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
  /**
   * Appartenance STRICTE, et la SEULE porte de lecture d'une équipe : fiche,
   * roster, historique de raid et classement interne y passent tous. Un
   * invité en attente n'y a pas droit — l'aperçu qui lui permet de décider
   * est servi par `GET /invitations/:token`, qui ne montre que le nom de
   * l'équipe et l'inviteur.
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

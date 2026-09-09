import Boom from '@hapi/boom'
import slugify from 'slugify'

import type { IocContainer } from '../../types/application/ioc'
import type { TeamDomainInterface } from '../../types/domain/team/team.domain.interface'
import type {
  InvitationEntity,
  TeamSummary,
  TeamWithMembers,
} from '../../types/domain/team/team.types'
import type { IMailService } from '../../types/infra/mail/mail.service.interface'
import type { IInvitationRepository } from '../../types/infra/orm/repositories/invitation.repository.interface'
import type { ITeamRepository } from '../../types/infra/orm/repositories/team.repository.interface'
import type { ITeamMemberRepository } from '../../types/infra/orm/repositories/team-member.repository.interface'
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface'
import type { AchievementsDomainInterface } from '../achievements/achievements.domain.interface'
import type { IDuelDomain } from '../../types/domain/wagers/wagers.domain.interface'
import { retryOnSerialization } from '../shared/retry-serialization'

const MAX_TEAMS_PER_USER = 3
const MAX_MEMBERS_PER_TEAM = 100
const INVITATION_TTL_MS = 48 * 60 * 60 * 1000

// Défauts Prisma : 5 s pour le corps d'une transaction interactive, 2 s pour
// acquérir une connexion. La suppression d'une équipe déclenche une cascade
// qui emporte membres, invitations, raids, duels, paris et transferts : sur
// une grosse équipe, ni l'un ni l'autre ne suffit.
const DELETE_TX_TIMEOUT_MS = 30_000
const DELETE_TX_MAX_WAIT_MS = 10_000

/**
 * Message du refus. Il nomme ce qui bloque et ce qu'il faut attendre : le
 * propriétaire n'a rien à réparer, juste à laisser ses enjeux se conclure.
 */
function pendingWagersMessage(openBets: number, openDuels: number): string {
  const parts: string[] = []
  if (openBets > 0) {
    parts.push(`${openBets} pari${openBets > 1 ? 's' : ''}`)
  }
  if (openDuels > 0) {
    parts.push(`${openDuels} duel${openDuels > 1 ? 's' : ''}`)
  }
  return `Cette équipe a encore ${parts.join(' et ')} en cours : attends leur résolution avant de la supprimer. Une mise engagée ne peut pas être rendue, et les cartes d'un duel doivent revenir à son vainqueur.`
}

export class TeamDomain implements TeamDomainInterface {
  readonly #teamRepo: ITeamRepository
  readonly #memberRepo: ITeamMemberRepository
  readonly #invitationRepo: IInvitationRepository
  readonly #userRepo: UserRepositoryInterface
  readonly #postgresOrm: IocContainer['postgresOrm']
  readonly #mailService: IMailService
  readonly #achievementsDomain: AchievementsDomainInterface
  readonly #duelDomain: IDuelDomain

  constructor({
    teamRepository,
    teamMemberRepository,
    invitationRepository,
    userRepository,
    postgresOrm,
    mailService,
    achievementsDomain,
    duelDomain,
  }: IocContainer) {
    this.#teamRepo = teamRepository
    this.#memberRepo = teamMemberRepository
    this.#invitationRepo = invitationRepository
    this.#userRepo = userRepository
    this.#postgresOrm = postgresOrm
    this.#mailService = mailService
    this.#achievementsDomain = achievementsDomain
    this.#duelDomain = duelDomain
  }

  async createTeam(
    ownerId: string,
    data: { name: string; description?: string },
  ): Promise<TeamWithMembers> {
    const count = await this.#teamRepo.countByUserId(ownerId)
    if (count >= MAX_TEAMS_PER_USER) {
      throw Boom.forbidden(
        `Maximum ${MAX_TEAMS_PER_USER} équipes par utilisateur`,
      )
    }

    const slug = slugify(data.name, { lower: true, strict: true })

    // Wrap in a transaction so the creator's TEAM_JOINED event is tracked
    // atomically with the team + member row creation.
    return this.#postgresOrm.executeWithTransactionClient(async (tx) => {
      const team = await tx.team.create({
        data: {
          name: data.name,
          slug,
          description: data.description,
          ownerId,
          members: { create: { userId: ownerId, role: 'OWNER' } },
        },
        include: {
          members: {
            include: {
              user: { select: { id: true, username: true, avatar: true } },
            },
          },
        },
      })
      // The creator becomes a member — track the event so the join_team quest progresses.
      await this.#achievementsDomain.track(tx, ownerId, { kind: 'TEAM_JOINED' })
      return team as unknown as TeamWithMembers
    })
  }

  async #resolveInvitationTarget(
    teamId: string,
    target: { email?: string; username?: string },
  ): Promise<{ targetUserId?: string; targetEmail?: string }> {
    if (target.username) {
      const user = await this.#userRepo.findByUsername(target.username)
      if (!user) {
        throw Boom.notFound('User not found')
      }
      const alreadyMember = await this.#memberRepo.findByTeamAndUser(
        teamId,
        user.id,
      )
      if (alreadyMember) {
        throw Boom.conflict('User is already a member')
      }
      const existing = await this.#invitationRepo.findPendingByTeamAndUser(
        teamId,
        user.id,
      )
      if (existing) {
        throw Boom.conflict('Invitation already pending for this user')
      }
      return { targetUserId: user.id }
    }
    if (target.email) {
      const existing = await this.#invitationRepo.findPendingByTeamAndEmail(
        teamId,
        target.email,
      )
      if (existing) {
        throw Boom.conflict('Invitation already pending for this email')
      }
      return { targetEmail: target.email }
    }
    throw Boom.badRequest('Provide email or username')
  }

  async inviteMember(
    teamId: string,
    actorId: string,
    target: { email?: string; username?: string },
  ): Promise<InvitationEntity> {
    const team = await this.#teamRepo.findById(teamId)
    if (!team) {
      throw Boom.notFound('Team not found')
    }

    const actor = team.members.find((m) => m.userId === actorId)
    if (!actor || actor.role === 'MEMBER') {
      throw Boom.forbidden('Only ADMIN or OWNER can invite members')
    }

    const memberCount = await this.#memberRepo.countByTeam(teamId)
    if (memberCount >= MAX_MEMBERS_PER_TEAM) {
      throw Boom.forbidden(`Maximum ${MAX_MEMBERS_PER_TEAM} membres par équipe`)
    }

    const { targetUserId, targetEmail } = await this.#resolveInvitationTarget(
      teamId,
      target,
    )

    const invitation = await this.#invitationRepo.create({
      teamId,
      invitedById: actorId,
      invitedEmail: targetEmail,
      invitedUserId: targetUserId,
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    })

    // Send invitation email (non-fatal)
    const inviterUser = await this.#userRepo.findById(actorId)
    const recipientEmail =
      invitation.invitedEmail ??
      (invitation.invitedUserId
        ? ((await this.#userRepo.findById(invitation.invitedUserId))?.email ??
          null)
        : null)

    if (recipientEmail && inviterUser) {
      try {
        await this.#mailService.sendTeamInvitationEmail({
          to: recipientEmail,
          teamName: team.name,
          inviterName: inviterUser.username,
          token: invitation.token,
        })
        await this.#invitationRepo.updateEmailSentAt(invitation.id, new Date())
      } catch {
        // Email failure is non-fatal
      }
    }

    return invitation
  }

  async acceptInvitation(token: string, userId: string): Promise<void> {
    const invitation = await this.#invitationRepo.findByToken(token)
    if (!invitation) {
      throw Boom.notFound('Invitation not found')
    }
    if (invitation.status !== 'PENDING') {
      throw Boom.conflict('Invitation already processed')
    }
    if (invitation.expiresAt < new Date()) {
      throw Boom.resourceGone('Invitation expired')
    }

    if (invitation.invitedUserId && invitation.invitedUserId !== userId) {
      throw Boom.forbidden('This invitation is for another user')
    }

    const alreadyMember = await this.#memberRepo.findByTeamAndUser(
      invitation.teamId,
      userId,
    )
    if (alreadyMember) {
      throw Boom.conflict('Already a member of this team')
    }

    const userCount = await this.#teamRepo.countByUserId(userId)
    if (userCount >= MAX_TEAMS_PER_USER) {
      throw Boom.forbidden(
        `Maximum ${MAX_TEAMS_PER_USER} équipes par utilisateur`,
      )
    }

    await this.#postgresOrm.executeWithTransactionClient(async (tx) => {
      await tx.teamMember.create({
        data: { teamId: invitation.teamId, userId, role: 'MEMBER' },
      })
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      })
      await this.#achievementsDomain.track(tx, userId, { kind: 'TEAM_JOINED' })
    })
  }

  async declineInvitation(token: string, userId: string): Promise<void> {
    const invitation = await this.#invitationRepo.findByToken(token)
    if (!invitation) {
      throw Boom.notFound('Invitation not found')
    }
    if (invitation.status !== 'PENDING') {
      throw Boom.conflict('Invitation already processed')
    }
    if (invitation.invitedUserId && invitation.invitedUserId !== userId) {
      throw Boom.forbidden('This invitation is for another user')
    }
    await this.#invitationRepo.updateStatus(invitation.id, 'DECLINED')
  }

  async removeMember(
    teamId: string,
    actorId: string,
    targetUserId: string,
  ): Promise<void> {
    const team = await this.#teamRepo.findById(teamId)
    if (!team) {
      throw Boom.notFound('Team not found')
    }

    const actor = team.members.find((m) => m.userId === actorId)
    if (!actor || actor.role === 'MEMBER') {
      throw Boom.forbidden('Insufficient permissions')
    }

    const target = team.members.find((m) => m.userId === targetUserId)
    if (!target) {
      throw Boom.notFound('Member not found')
    }
    if (target.role === 'OWNER') {
      throw Boom.forbidden('Cannot remove the owner')
    }
    if (actor.role === 'ADMIN' && target.role === 'ADMIN') {
      throw Boom.forbidden('ADMIN cannot remove another ADMIN')
    }

    await this.#memberRepo.remove(teamId, targetUserId)
  }

  async leaveTeam(teamId: string, userId: string): Promise<void> {
    const team = await this.#teamRepo.findById(teamId)
    if (!team) {
      throw Boom.notFound('Team not found')
    }

    const member = team.members.find((m) => m.userId === userId)
    if (!member) {
      throw Boom.notFound('Not a member of this team')
    }
    if (member.role === 'OWNER') {
      throw Boom.forbidden('Owner must transfer ownership before leaving')
    }

    await this.#memberRepo.remove(teamId, userId)
  }

  async transferOwnership(
    teamId: string,
    ownerId: string,
    newOwnerId: string,
  ): Promise<void> {
    const team = await this.#teamRepo.findById(teamId)
    if (!team) {
      throw Boom.notFound('Team not found')
    }
    if (team.ownerId !== ownerId) {
      throw Boom.forbidden('Only the owner can transfer ownership')
    }

    const newOwner = team.members.find((m) => m.userId === newOwnerId)
    if (!newOwner) {
      throw Boom.notFound('New owner must be a member of the team')
    }

    await this.#postgresOrm.prisma.$transaction([
      this.#postgresOrm.prisma.team.update({
        where: { id: teamId },
        data: { ownerId: newOwnerId },
      }),
      this.#postgresOrm.prisma.teamMember.update({
        where: { teamId_userId: { teamId, userId: ownerId } },
        data: { role: 'MEMBER' },
      }),
      this.#postgresOrm.prisma.teamMember.update({
        where: { teamId_userId: { teamId, userId: newOwnerId } },
        data: { role: 'OWNER' },
      }),
    ])
  }

  async updateTeam(
    teamId: string,
    userId: string,
    data: { name: string; description?: string },
  ): Promise<TeamWithMembers> {
    const team = await this.#teamRepo.findById(teamId)
    if (!team) {
      throw Boom.notFound('Team not found')
    }
    if (team.ownerId !== userId) {
      throw Boom.forbidden('Only the owner can update the team')
    }

    const slug = slugify(data.name, { lower: true, strict: true })
    return this.#teamRepo.update(teamId, {
      name: data.name,
      slug,
      description: data.description,
    })
  }

  /**
   * Supprime l'équipe — et REFUSE tant qu'un enjeu y court encore.
   *
   * Les clés étrangères de Duel et de Bet sont en `onDelete: Cascade` :
   * supprimer l'équipe efface ses paris et ses duels. Or la mise d'un pari
   * est débitée AU PLACEMENT et n'existe nulle part ailleurs, et les cartes
   * comptées d'un duel sont dues au vainqueur.
   *
   * La version précédente remboursait la mise et annulait les duels. C'était
   * encore une option gratuite, simplement déplacée : le propriétaire parie
   * sur un compte complice, la cible tire, un tirage qualifiant règle le
   * pari en gain au moment même du tirage — et si la fenêtre tourne mal, la
   * cible cesse de tirer et le propriétaire supprime l'équipe avant
   * l'échéance pour récupérer sa mise. Espérance positive, aucun risque, et
   * répétable : le plafond porte sur les équipes SIMULTANÉES, pas sur le
   * fait d'en recréer une. Même forme côté cartes — un duelliste en train de
   * perdre supprimait l'équipe et ses cartes comptées ne partaient jamais.
   *
   * D'où la règle : on ne rend rien et on ne détruit rien. Si un enjeu court
   * encore, la suppression est REFUSÉE et le propriétaire attend — au plus
   * quelques jours, le délai d'acceptation et l'échéance étant tous deux
   * bornés.
   *
   * La passe de règlement AVANT ce contrôle est ce qui rend le refus juste
   * plutôt que trop zélé : le règlement est paresseux (un pari ne se tranche
   * qu'au tirage suivant de la cible ou à la lecture de la vue d'équipe), si
   * bien qu'un enjeu dont l'issue est DÉJÀ déterminée dort en ACTIVE jusqu'à
   * ce que quelqu'un le regarde. Sans elle, on refuserait des suppressions
   * parfaitement légitimes.
   *
   * Effet de bord recherché : un règlement qui échoue laisse son enjeu
   * ACTIVE, donc BLOQUE la suppression au lieu de la laisser détruire une
   * ligne qu'on n'a pas su trancher. `settleTeamWagers` est idempotent, le
   * propriétaire n'a qu'à réessayer.
   */
  async deleteTeam(teamId: string, userId: string): Promise<void> {
    const team = await this.#teamRepo.findById(teamId)
    if (!team) {
      throw Boom.notFound('Team not found')
    }
    if (team.ownerId !== userId) {
      throw Boom.forbidden('Only the owner can delete the team')
    }

    // Hors transaction, exprès : chaque règlement ouvre la sienne.
    await this.#duelDomain.settleTeamWagers(teamId, new Date())

    await retryOnSerialization(() =>
      this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          // Comptés DANS la transaction, avec la suppression : hors
          // transaction, un pari placé entre le contrôle et la suppression
          // serait détruit avec sa mise. Sous Serializable, ces comptes sont
          // des lectures de prédicat que le placement concurrent contredit —
          // l'une des deux transactions échoue en P2034 et `retryOnSerialization`
          // la rejoue, cette fois avec le pari en vue.
          const [openBets, openDuels] = await Promise.all([
            tx.bet.count({ where: { teamId, status: 'ACTIVE' } }),
            tx.duel.count({
              where: { teamId, status: { in: ['PENDING', 'ACTIVE'] } },
            }),
          ])
          if (openBets > 0 || openDuels > 0) {
            throw Boom.conflict(pendingWagersMessage(openBets, openDuels))
          }

          await this.#teamRepo.deleteInTx(tx, teamId)
        },
        {
          isolationLevel: 'Serializable',
          // La transaction se réduit à deux comptes et une suppression, mais
          // cette suppression est une cascade qui emporte membres,
          // invitations, raids, duels, paris et transferts : sur une grosse
          // équipe elle dépasse le délai Prisma par défaut de 5 s. On relève
          // AUSSI `maxWait` — l'attente d'une connexion du pool, à 2 s par
          // défaut — sinon la même grosse équipe échoue avant même d'ouvrir.
          maxWait: DELETE_TX_MAX_WAIT_MS,
          timeout: DELETE_TX_TIMEOUT_MS,
        },
      ),
    )
  }

  getMyTeams(userId: string): Promise<TeamSummary[]> {
    return this.#teamRepo.findByUserId(userId)
  }

  async getTeam(teamId: string, userId: string): Promise<TeamWithMembers> {
    const team = await this.#teamRepo.findById(teamId)
    if (!team) {
      throw Boom.notFound('Team not found')
    }
    const isMember = team.members.some((m) => m.userId === userId)
    if (!isMember) {
      // Users who have a pending invitation can preview the team they were
      // invited to (read-only). This unblocks the in-app invitation flow
      // where clicking the notification opens the inviting team's page
      // before they decide to accept or decline.
      const pendingInvite = await this.#invitationRepo.findPendingByTeamAndUser(
        teamId,
        userId,
      )
      if (!pendingInvite) {
        throw Boom.forbidden('Not a member of this team')
      }
    }
    return team
  }

  async resendInvitationEmail(token: string, actorId: string): Promise<void> {
    const invitation = await this.#invitationRepo.findByToken(token)
    if (!invitation || invitation.status !== 'PENDING') {
      throw Boom.notFound('Invitation not found or not pending')
    }

    const team = await this.#teamRepo.findById(invitation.teamId)
    if (!team) {
      throw Boom.internal('Team not found')
    }

    const actor = team.members.find((m) => m.userId === actorId)
    if (!actor || actor.role === 'MEMBER') {
      throw Boom.forbidden('Only ADMIN or OWNER can resend invitations')
    }

    // Cooldown: 5 minutes since last emailSentAt
    if (invitation.emailSentAt) {
      const elapsed = Date.now() - invitation.emailSentAt.getTime()
      if (elapsed < 5 * 60 * 1000) {
        const retryAfterSeconds = Math.ceil((5 * 60 * 1000 - elapsed) / 1000)
        throw Boom.tooManyRequests('Cooldown actif', { retryAfterSeconds })
      }
    }

    const recipientEmail =
      invitation.invitedEmail ??
      (invitation.invitedUserId
        ? ((await this.#userRepo.findById(invitation.invitedUserId))?.email ??
          null)
        : null)

    if (!recipientEmail) {
      throw Boom.badRequest('No recipient email found')
    }

    const inviter = invitation.invitedById
      ? await this.#userRepo.findById(invitation.invitedById)
      : null

    await this.#mailService.sendTeamInvitationEmail({
      to: recipientEmail,
      teamName: team.name,
      inviterName: inviter?.username ?? "Quelqu'un",
      token: invitation.token,
    })

    await this.#invitationRepo.updateEmailSentAt(invitation.id, new Date())
  }
}

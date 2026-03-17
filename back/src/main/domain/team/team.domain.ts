import Boom from '@hapi/boom'
import slugify from 'slugify'

import type { IocContainer } from '../../types/application/ioc'
import type { TeamDomainInterface } from '../../types/domain/team/team.domain.interface'
import type {
  InvitationEntity,
  TeamSummary,
  TeamWithMembers,
} from '../../types/domain/team/team.types'
import type { IInvitationRepository } from '../../types/infra/orm/repositories/invitation.repository.interface'
import type { ITeamRepository } from '../../types/infra/orm/repositories/team.repository.interface'
import type { ITeamMemberRepository } from '../../types/infra/orm/repositories/team-member.repository.interface'
import type { UserRepositoryInterface } from '../../types/infra/orm/repositories/user.repository.interface'

const MAX_TEAMS_PER_USER = 5
const MAX_MEMBERS_PER_TEAM = 100
const INVITATION_TTL_MS = 48 * 60 * 60 * 1000

export class TeamDomain implements TeamDomainInterface {
  readonly #teamRepo: ITeamRepository
  readonly #memberRepo: ITeamMemberRepository
  readonly #invitationRepo: IInvitationRepository
  readonly #userRepo: UserRepositoryInterface
  readonly #postgresOrm: IocContainer['postgresOrm']

  constructor({
    teamRepository,
    teamMemberRepository,
    invitationRepository,
    userRepository,
    postgresOrm,
  }: IocContainer) {
    this.#teamRepo = teamRepository
    this.#memberRepo = teamMemberRepository
    this.#invitationRepo = invitationRepository
    this.#userRepo = userRepository
    this.#postgresOrm = postgresOrm
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
    const team = await this.#teamRepo.create(ownerId, {
      name: data.name,
      slug,
      description: data.description,
    })
    const full = await this.#teamRepo.findById(team.id)
    if (!full) {
      throw Boom.internal('Team creation failed')
    }
    return full
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

    return this.#invitationRepo.create({
      teamId,
      invitedById: actorId,
      invitedEmail: targetEmail,
      invitedUserId: targetUserId,
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    })
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

    await this.#memberRepo.add(invitation.teamId, userId, 'MEMBER')
    await this.#invitationRepo.updateStatus(invitation.id, 'ACCEPTED')
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

  async deleteTeam(teamId: string, userId: string): Promise<void> {
    const team = await this.#teamRepo.findById(teamId)
    if (!team) {
      throw Boom.notFound('Team not found')
    }
    if (team.ownerId !== userId) {
      throw Boom.forbidden('Only the owner can delete the team')
    }
    await this.#teamRepo.delete(teamId)
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
      throw Boom.forbidden('Not a member of this team')
    }
    return team
  }
}

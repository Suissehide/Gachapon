import type { IocContainer } from '../../../types/application/ioc'
import type { InvitationEntity } from '../../../types/domain/team/team.types'
import type { IInvitationRepository } from '../../../types/infra/orm/repositories/invitation.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class InvitationRepository implements IInvitationRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  findByToken(token: string): Promise<InvitationEntity | null> {
    return this.#prisma.invitation.findUnique({ where: { token } })
  }

  findPendingByTeamAndUser(
    teamId: string,
    userId: string,
  ): Promise<InvitationEntity | null> {
    return this.#prisma.invitation.findFirst({
      where: { teamId, invitedUserId: userId, status: 'PENDING' },
    })
  }

  findPendingByTeamAndEmail(
    teamId: string,
    email: string,
  ): Promise<InvitationEntity | null> {
    return this.#prisma.invitation.findFirst({
      where: { teamId, invitedEmail: email, status: 'PENDING' },
    })
  }

  create(data: {
    teamId: string
    invitedById?: string
    invitedUserId?: string
    invitedEmail?: string
    expiresAt: Date
  }): Promise<InvitationEntity> {
    return this.#prisma.invitation.create({ data })
  }

  updateStatus(
    id: string,
    status: 'ACCEPTED' | 'DECLINED' | 'CANCELLED',
  ): Promise<void> {
    return this.#prisma.invitation
      .update({ where: { id }, data: { status } })
      .then(() => undefined)
  }

  findPendingByTeam(teamId: string): Promise<
    (InvitationEntity & {
      invitedUser: { username: string } | null
    })[]
  > {
    return this.#prisma.invitation.findMany({
      where: { teamId, status: 'PENDING' },
      include: { invitedUser: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async updateEmailSentAt(id: string, sentAt: Date): Promise<void> {
    await this.#prisma.invitation.update({
      where: { id },
      data: { emailSentAt: sentAt },
    })
  }

  findById(id: string): Promise<InvitationEntity | null> {
    return this.#prisma.invitation.findUnique({ where: { id } })
  }

  findAllByTeam(teamId: string): Promise<
    (InvitationEntity & {
      invitedUser: { username: string } | null
    })[]
  > {
    return this.#prisma.invitation.findMany({
      where: { teamId },
      include: { invitedUser: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  cancelById(id: string): Promise<void> {
    return this.#prisma.invitation
      .update({ where: { id }, data: { status: 'CANCELLED' } })
      .then(() => undefined)
  }

  deleteById(id: string): Promise<void> {
    return this.#prisma.invitation
      .delete({ where: { id } })
      .then(() => undefined)
  }
}

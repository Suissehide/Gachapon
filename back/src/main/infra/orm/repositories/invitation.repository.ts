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

  updateStatus(id: string, status: 'ACCEPTED' | 'DECLINED'): Promise<void> {
    return this.#prisma.invitation
      .update({ where: { id }, data: { status } })
      .then(() => undefined)
  }
}

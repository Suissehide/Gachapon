import type { IocContainer } from '../../../types/application/ioc'
import type {
  TeamSummary,
  TeamWithMembers,
} from '../../../types/domain/team/team.types'
import type { ITeamRepository } from '../../../types/infra/orm/repositories/team.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class TeamRepository implements ITeamRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  findById(id: string): Promise<TeamWithMembers | null> {
    return this.#prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true, avatar: true } },
          },
        },
      },
    }) as unknown as Promise<TeamWithMembers | null>
  }

  findByUserId(userId: string): Promise<TeamSummary[]> {
    return this.#prisma.team.findMany({
      where: { members: { some: { userId } } },
      include: {
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
    }) as unknown as Promise<TeamSummary[]>
  }

  countByUserId(userId: string): Promise<number> {
    return this.#prisma.teamMember.count({ where: { userId } })
  }

  create(
    ownerId: string,
    data: { name: string; slug: string; description?: string },
  ): Promise<TeamWithMembers> {
    return this.#prisma.team.create({
      data: {
        ...data,
        ownerId,
        members: {
          create: { userId: ownerId, role: 'OWNER' },
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true, avatar: true } },
          },
        },
      },
    }) as unknown as Promise<TeamWithMembers>
  }

  delete(id: string): Promise<void> {
    return this.#prisma.team.delete({ where: { id } }).then(() => undefined)
  }
}

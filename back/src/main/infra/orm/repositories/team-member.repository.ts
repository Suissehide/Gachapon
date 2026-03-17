import type { IocContainer } from '../../../types/application/ioc'
import type { TeamMemberRole } from '../../../types/domain/team/team.types'
import type { ITeamMemberRepository } from '../../../types/infra/orm/repositories/team-member.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class TeamMemberRepository implements ITeamMemberRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  findByTeamAndUser(teamId: string, userId: string) {
    return this.#prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    })
  }

  countByTeam(teamId: string): Promise<number> {
    return this.#prisma.teamMember.count({ where: { teamId } })
  }

  add(teamId: string, userId: string, role: TeamMemberRole): Promise<void> {
    return this.#prisma.teamMember
      .create({ data: { teamId, userId, role } })
      .then(() => undefined)
  }

  remove(teamId: string, userId: string): Promise<void> {
    return this.#prisma.teamMember
      .delete({
        where: { teamId_userId: { teamId, userId } },
      })
      .then(() => undefined)
  }

  updateRole(
    teamId: string,
    userId: string,
    role: TeamMemberRole,
  ): Promise<void> {
    return this.#prisma.teamMember
      .update({
        where: { teamId_userId: { teamId, userId } },
        data: { role },
      })
      .then(() => undefined)
  }
}

import type { TeamSummary, TeamWithMembers } from '../../../domain/team/team.types'

export interface ITeamRepository {
  findById(id: string): Promise<TeamWithMembers | null>
  findByUserId(userId: string): Promise<TeamSummary[]>
  countByUserId(userId: string): Promise<number>
  create(
    ownerId: string,
    data: { name: string; slug: string; description?: string },
  ): Promise<TeamWithMembers>
  delete(id: string): Promise<void>
}

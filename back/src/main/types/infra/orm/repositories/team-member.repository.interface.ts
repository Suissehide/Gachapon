import type {
  TeamMemberEntity,
  TeamMemberRole,
} from '../../../domain/team/team.types'

export interface ITeamMemberRepository {
  findByTeamAndUser(
    teamId: string,
    userId: string,
  ): Promise<TeamMemberEntity | null>
  countByTeam(teamId: string): Promise<number>
  add(teamId: string, userId: string, role: TeamMemberRole): Promise<void>
  remove(teamId: string, userId: string): Promise<void>
  updateRole(
    teamId: string,
    userId: string,
    role: TeamMemberRole,
  ): Promise<void>
}

import type { IocContainer } from '../../../types/application/ioc'
import type {
  ActiveCardCounts,
  CollectorRankingRow,
  ILeaderboardRepository,
  LeaderboardUser,
  QuestWithReward,
  TeamWithMembers,
  UserCardForScoring,
} from '../../../types/infra/orm/repositories/leaderboard.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class LeaderboardRepository implements ILeaderboardRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  async countActiveCards(): Promise<ActiveCardCounts> {
    const [total, variantEligible] = await Promise.all([
      this.#prisma.card.count({ where: { set: { isActive: true } } }),
      this.#prisma.card.count({
        where: {
          set: { isActive: true },
          rarity: { in: ['RARE', 'EPIC', 'LEGENDARY'] },
        },
      }),
    ])
    return { total, variantEligible }
  }

  getCollectorRanking(limit: number): Promise<CollectorRankingRow[]> {
    return this.#prisma.$queryRaw<CollectorRankingRow[]>`
      SELECT
        "userId",
        COUNT(DISTINCT "cardId") AS "distinctCards",
        COUNT(*) AS "totalVariants"
      FROM "UserCard"
      GROUP BY "userId"
      ORDER BY "totalVariants" DESC, COUNT(DISTINCT "cardId") DESC
      LIMIT ${limit}
    `
  }

  getUsersByIds(ids: string[]): Promise<LeaderboardUser[]> {
    return this.#prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, username: true, avatar: true },
    })
  }

  getTeamsWithMembers(limit: number): Promise<TeamWithMembers[]> {
    return this.#prisma.team.findMany({
      include: {
        members: { select: { userId: true } },
        _count: { select: { members: true } },
      },
      take: limit,
    }) as Promise<TeamWithMembers[]>
  }

  getUserCardsByUserIds(userIds: string[]): Promise<UserCardForScoring[]> {
    return this.#prisma.userCard.findMany({
      where: { userId: { in: userIds } },
      select: {
        userId: true,
        variant: true,
        quantity: true,
        card: { select: { rarity: true } },
      },
    }) as Promise<UserCardForScoring[]>
  }

  async getActiveQuests(): Promise<QuestWithReward[]> {
    const quests = await this.#prisma.quest.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: { reward: true },
    })
    return quests.map((q) => ({
      id: q.id,
      key: q.key,
      name: q.name,
      description: q.description,
      reward: q.reward
        ? { tokens: q.reward.tokens, dust: q.reward.dust }
        : null,
    }))
  }
}

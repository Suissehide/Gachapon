import type { IocContainer } from '../../../types/application/ioc'
import type {
  ILeaderboardRepository,
  CollectorRow,
  LeaderboardUser,
  LegendaryRow,
  TeamWithMembers,
  UserCardForScoring,
  QuestWithReward,
} from '../../../types/infra/orm/repositories/leaderboard.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class LeaderboardRepository implements ILeaderboardRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  countActiveCards(): Promise<number> {
    return this.#prisma.card.count({ where: { set: { isActive: true } } })
  }

  getCollectorRows(limit: number): Promise<CollectorRow[]> {
    return this.#prisma.userCard.groupBy({
      by: ['userId'],
      _count: { cardId: true },
      orderBy: { _count: { cardId: 'desc' } },
      take: limit,
    })
  }

  getUsersByIds(ids: string[]): Promise<LeaderboardUser[]> {
    return this.#prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, username: true, avatar: true },
    })
  }

  async getLegendaryCardIds(): Promise<string[]> {
    const cards = await this.#prisma.card.findMany({
      where: { rarity: 'LEGENDARY' },
      select: { id: true },
    })
    return cards.map((c) => c.id)
  }

  getLegendaryRows(cardIds: string[], limit: number): Promise<LegendaryRow[]> {
    return this.#prisma.userCard.groupBy({
      by: ['userId'],
      where: { cardId: { in: cardIds } },
      _count: { cardId: true },
      orderBy: { _count: { cardId: 'desc' } },
      take: limit,
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
      reward: q.reward ? { tokens: q.reward.tokens, dust: q.reward.dust } : null,
    }))
  }
}

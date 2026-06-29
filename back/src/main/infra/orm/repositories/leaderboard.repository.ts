import type { IocContainer } from '../../../types/application/ioc'
import type {
  ActiveCardCounts,
  CollectorRankingRow,
  CollectorRankingRowWithLevel,
  CombatTeamCardForPower,
  ILeaderboardRepository,
  LeaderboardUser,
  QuestWithReward,
  TeamForRanking,
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
        cardId: true,
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

  getCollectorRankingWithLevel(
    limit: number,
  ): Promise<CollectorRankingRowWithLevel[]> {
    return this.#prisma.$queryRaw<CollectorRankingRowWithLevel[]>`
      SELECT
        uc."userId",
        COUNT(DISTINCT uc."cardId") AS "distinctCards",
        COUNT(*) AS "totalVariants",
        u."level"
      FROM "UserCard" uc
      JOIN "User" u ON u."id" = uc."userId"
      GROUP BY uc."userId", u."level"
      ORDER BY COUNT(DISTINCT uc."cardId") DESC, COUNT(*) DESC
      LIMIT ${limit}
    `
  }

  async getCurrentUserCollectorRow(
    userId: string,
  ): Promise<CollectorRankingRowWithLevel | null> {
    const rows = await this.#prisma.$queryRaw<CollectorRankingRowWithLevel[]>`
      SELECT
        uc."userId",
        COUNT(DISTINCT uc."cardId") AS "distinctCards",
        COUNT(*) AS "totalVariants",
        u."level"
      FROM "UserCard" uc
      JOIN "User" u ON u."id" = uc."userId"
      WHERE uc."userId" = ${userId}
      GROUP BY uc."userId", u."level"
    `
    return rows[0] ?? null
  }

  async countCollectorsAhead(
    userId: string,
    distinctCards: number,
    totalVariants: number,
  ): Promise<number> {
    // Strict "ahead of me": higher distinctCards OR (equal distinct AND higher variants).
    // Use the same lexicographic order as getCollectorRankingWithLevel.
    const rows = await this.#prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM (
        SELECT "userId",
               COUNT(DISTINCT "cardId") AS "d",
               COUNT(*) AS "v"
        FROM "UserCard"
        GROUP BY "userId"
      ) sub
      WHERE sub."userId" <> ${userId}
        AND (
          sub."d" > ${distinctCards}
          OR (sub."d" = ${distinctCards} AND sub."v" > ${totalVariants})
        )
    `
    return Number(rows[0]?.count ?? 0)
  }

  async countCollectors(): Promise<number> {
    const rows = await this.#prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT "userId")::bigint AS count FROM "UserCard"
    `
    return Number(rows[0]?.count ?? 0)
  }

  async countPullsByUsers(userIds: string[]): Promise<Map<string, number>> {
    if (userIds.length === 0) { return new Map() }
    const groups = await this.#prisma.gachaPull.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds } },
      _count: { _all: true },
    })
    return new Map(groups.map((g) => [g.userId, g._count._all]))
  }

  async countLegendariesByUsers(
    userIds: string[],
  ): Promise<Map<string, number>> {
    if (userIds.length === 0) { return new Map() }
    const groups = await this.#prisma.userCard.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, card: { rarity: 'LEGENDARY' } },
      _count: { _all: true },
    })
    return new Map(groups.map((g) => [g.userId, g._count._all]))
  }

  async getTeamsForRanking(): Promise<TeamForRanking[]> {
    const rows = await this.#prisma.team.findMany({
      include: {
        members: { select: { userId: true } },
        _count: { select: { members: true } },
      },
    })
    return rows.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      memberCount: t._count.members,
      memberIds: t.members.map((m) => m.userId),
    }))
  }

  async getTeamIdForUser(userId: string): Promise<string | null> {
    const membership = await this.#prisma.teamMember.findFirst({
      where: { userId },
      select: { teamId: true },
    })
    return membership?.teamId ?? null
  }

  countCampaignStages(): Promise<number> {
    return this.#prisma.campaignStage.count()
  }

  getAllCampaignStagesOrdered(): Promise<
    { chapter: number; index: number }[]
  > {
    return this.#prisma.campaignStage.findMany({
      select: { chapter: true, index: true },
      orderBy: [{ chapter: 'asc' }, { index: 'asc' }],
    })
  }

  async getCampaignProgressByUsers(
    userIds: string[],
  ): Promise<Map<string, { highestChapter: number; highestIndex: number }>> {
    if (userIds.length === 0) { return new Map() }
    const rows = await this.#prisma.userCampaignProgress.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, highestChapter: true, highestIndex: true },
    })
    return new Map(
      rows.map((r) => [
        r.userId,
        { highestChapter: r.highestChapter, highestIndex: r.highestIndex },
      ]),
    )
  }

  computePalierForProgress(
    progress: { highestChapter: number; highestIndex: number } | null,
    stagesOrdered: { chapter: number; index: number }[],
  ): number {
    if (!progress) { return 0 }
    let count = 0
    for (const s of stagesOrdered) {
      if (
        s.chapter < progress.highestChapter ||
        (s.chapter === progress.highestChapter && s.index <= progress.highestIndex)
      ) {
        count++
      }
    }
    return count
  }

  async getActiveUserIds(): Promise<string[]> {
    // Users with at least one combat-team slot OR at least one UserCard.
    // The combat leaderboard only makes sense for users who can fight.
    const rows = await this.#prisma.user.findMany({
      where: { combatTeam: { isEmpty: false } },
      select: { id: true },
    })
    return rows.map((r) => r.id)
  }

  async getCombatTeamCardsByUsers(
    userIds: string[],
  ): Promise<Map<string, CombatTeamCardForPower[]>> {
    if (userIds.length === 0) { return new Map() }
    // 1) Get users' combatTeam (array of UserCard IDs).
    const users = await this.#prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, combatTeam: true },
    })
    const allUserCardIds = users.flatMap((u) => u.combatTeam)
    if (allUserCardIds.length === 0) {
      return new Map(userIds.map((id) => [id, []]))
    }

    // 2) Get all those UserCards in one query, with card + equipment bonuses.
    const userCards = await this.#prisma.userCard.findMany({
      where: { id: { in: allUserCardIds } },
      select: {
        id: true,
        userId: true,
        level: true,
        palier: true,
        variant: true,
        card: {
          select: {
            baseHp: true,
            baseAtk: true,
            baseDef: true,
            baseSpd: true,
          },
        },
        equipment: {
          select: { equipment: { select: { bonuses: true } } },
        },
      },
    })

    // 3) Group by userId.
    const byUser = new Map<string, CombatTeamCardForPower[]>()
    for (const uid of userIds) { byUser.set(uid, []) }
    for (const uc of userCards) {
      const list = byUser.get(uc.userId) ?? []
      list.push({
        userCardId: uc.id,
        level: uc.level,
        palier: uc.palier,
        variant: uc.variant,
        card: uc.card,
        equipmentBonuses: uc.equipment.map(
          (e) =>
            (e.equipment.bonuses ?? {}) as Record<
              string,
              number | undefined
            >,
        ),
      })
      byUser.set(uc.userId, list)
    }
    return byUser
  }
}

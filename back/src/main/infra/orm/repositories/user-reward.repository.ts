import type { RewardSource, UserReward } from '../../../../generated/client'
import type { IocContainer } from '../../../types/application/ioc'
import type { PrimaTransactionClient } from '../../../types/infra/orm/client'
import type {
  PendingUserReward,
  UserRewardRepositoryInterface,
} from '../../../types/infra/orm/repositories/user-reward.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class UserRewardRepository implements UserRewardRepositoryInterface {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  upsertInTx(
    tx: PrimaTransactionClient,
    data: { userId: string; rewardId: string; source: RewardSource; sourceId: string },
  ): Promise<UserReward> {
    return tx.userReward.upsert({
      where: { userId_source_sourceId: { userId: data.userId, source: data.source, sourceId: data.sourceId } },
      create: data,
      update: {}, // Already exists — no-op (idempotent on retry)
    })
  }

  async findPendingByUser(userId: string): Promise<PendingUserReward[]> {
    const rows = await this.#prisma.userReward.findMany({
      where: { userId, claimedAt: null },
      include: { reward: true },
      orderBy: { createdAt: 'asc' },
    })
    // Attach streakMilestone data for STREAK source rows
    const streakIds = rows
      .filter((r) => r.source === 'STREAK' && r.sourceId)
      .map((r) => r.sourceId!)
    const milestones = streakIds.length
      ? await this.#prisma.streakMilestone.findMany({ where: { id: { in: streakIds } } })
      : []
    const milestoneMap = new Map(milestones.map((m) => [m.id, m]))
    return rows.map((r) => ({
      ...r,
      streakMilestone: r.sourceId ? (milestoneMap.get(r.sourceId) ?? null) : null,
    }))
  }

  async findByIdAndUser(id: string, userId: string): Promise<PendingUserReward | null> {
    // No claimedAt filter — caller checks claimedAt to distinguish 404 vs 409
    const row = await this.#prisma.userReward.findFirst({
      where: { id, userId },
      include: { reward: true },
    })
    if (!row) return null
    const milestone =
      row.source === 'STREAK' && row.sourceId
        ? await this.#prisma.streakMilestone.findUnique({ where: { id: row.sourceId } })
        : null
    return { ...row, streakMilestone: milestone }
  }

  countPendingByUser(userId: string): Promise<number> {
    return this.#prisma.userReward.count({ where: { userId, claimedAt: null } })
  }

  async markClaimedInTx(tx: PrimaTransactionClient, id: string): Promise<void> {
    await tx.userReward.update({ where: { id }, data: { claimedAt: new Date() } })
  }

  async markAllClaimedInTx(tx: PrimaTransactionClient, userId: string): Promise<void> {
    await tx.userReward.updateMany({
      where: { userId, claimedAt: null },
      data: { claimedAt: new Date() },
    })
  }

  async findHistoryByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ data: UserReward[]; total: number }> {
    const skip = (page - 1) * limit
    const [data, total] = await Promise.all([
      this.#prisma.userReward.findMany({
        where: { userId, claimedAt: { not: null } },
        include: { reward: true },
        orderBy: { claimedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.#prisma.userReward.count({ where: { userId, claimedAt: { not: null } } }),
    ])
    return { data, total }
  }
}

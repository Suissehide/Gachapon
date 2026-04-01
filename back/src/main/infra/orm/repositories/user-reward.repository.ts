import type { RewardSource, UserReward } from '../../../../generated/client'
import type { IocContainer } from '../../../types/application/ioc'
import type { PrimaTransactionClient } from '../../../types/infra/orm/client'
import { parseDailySourceId } from '../../../domain/streak/streak-source-id'
import type {
  PendingUserReward,
  UserRewardRepositoryInterface,
  UserRewardWithReward,
} from '../../../types/infra/orm/repositories/user-reward.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class UserRewardRepository implements UserRewardRepositoryInterface {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  create(data: { userId: string; rewardId: string; source: RewardSource; sourceId: string }): Promise<UserReward> {
    return this.#prisma.userReward.create({ data })
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
    const milestoneUuids = rows
      .filter((r) => r.source === 'STREAK' && r.sourceId && parseDailySourceId(r.sourceId) === null)
      .map((r) => r.sourceId!)
    const milestones = milestoneUuids.length
      ? await this.#prisma.streakMilestone.findMany({ where: { id: { in: milestoneUuids } } })
      : []
    const milestoneMap = new Map(milestones.map((m) => [m.id, { day: m.day, isMilestone: m.isMilestone }]))
    return rows.map((r) => {
      if (r.source !== 'STREAK' || !r.sourceId) {
        return { ...r, streakMilestone: null }
      }
      const dailyDay = parseDailySourceId(r.sourceId)
      if (dailyDay !== null) {
        return { ...r, streakMilestone: { day: dailyDay, isMilestone: false } }
      }
      return { ...r, streakMilestone: milestoneMap.get(r.sourceId) ?? null }
    })
  }

  async findByIdAndUser(id: string, userId: string): Promise<UserRewardWithReward | null> {
    // No claimedAt filter — caller checks claimedAt to distinguish 404 vs 409
    const row = await this.#prisma.userReward.findFirst({
      where: { id, userId },
      include: { reward: true },
    })
    return row ?? null
  }

  countPendingByUser(userId: string): Promise<number> {
    return this.#prisma.userReward.count({ where: { userId, claimedAt: null } })
  }

  async markClaimedInTx(tx: PrimaTransactionClient, id: string): Promise<void> {
    await tx.userReward.update({ where: { id }, data: { claimedAt: new Date() } })
  }

  async deleteLegacyDefaultStreakRewardInTx(
    tx: PrimaTransactionClient,
    userId: string,
    legacySourceId: string,
  ): Promise<void> {
    await tx.userReward.deleteMany({
      where: { userId, source: 'STREAK', sourceId: legacySourceId, claimedAt: null },
    })
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
  ): Promise<{ data: UserRewardWithReward[]; total: number }> {
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

import type { Reward, RewardSource, StreakMilestone, UserReward } from '../../../../../generated/client'
import type { PrimaTransactionClient } from '../client'

export type StreakMilestoneInfo = Pick<StreakMilestone, 'day' | 'isMilestone'>

export type PendingUserReward = UserReward & {
  reward: Reward
  streakMilestone: StreakMilestoneInfo | null
}

export type UserRewardWithReward = UserReward & { reward: Reward }

export interface UserRewardRepositoryInterface {
  create(data: { userId: string; rewardId: string; source: RewardSource; sourceId: string }): Promise<UserReward>
  upsertInTx(
    tx: PrimaTransactionClient,
    data: { userId: string; rewardId: string; source: RewardSource; sourceId: string },
  ): Promise<UserReward>
  findPendingByUser(userId: string): Promise<PendingUserReward[]>
  /** Finds a reward by id + userId with no claimedAt filter — for 404 vs 409 distinction */
  findByIdAndUser(id: string, userId: string): Promise<UserRewardWithReward | null>
  countPendingByUser(userId: string): Promise<number>
  markClaimedInTx(tx: PrimaTransactionClient, id: string): Promise<void>
  markAllClaimedInTx(tx: PrimaTransactionClient, userId: string): Promise<void>
  /** Removes unclaimed streak rewards created with a legacy sourceId (before the "day:N" format).
   *  Called during streak update to avoid duplicates when migrating from old to new format. */
  deleteLegacyDefaultStreakRewardInTx(tx: PrimaTransactionClient, userId: string, legacySourceId: string): Promise<void>
  findHistoryByUser(userId: string, page: number, limit: number): Promise<{ data: UserRewardWithReward[]; total: number }>
}

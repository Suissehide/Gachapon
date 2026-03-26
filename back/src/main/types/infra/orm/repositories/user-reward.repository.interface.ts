import type { Reward, RewardSource, StreakMilestone, UserReward } from '../../../../../generated/client'
import type { PrimaTransactionClient } from '../client'

export type PendingUserReward = UserReward & {
  reward: Reward
  streakMilestone: StreakMilestone | null
}

export interface UserRewardRepositoryInterface {
  upsertInTx(
    tx: PrimaTransactionClient,
    data: { userId: string; rewardId: string; source: RewardSource; sourceId: string },
  ): Promise<UserReward>
  findPendingByUser(userId: string): Promise<PendingUserReward[]>
  /** Finds a reward by id + userId with no claimedAt filter — for 404 vs 409 distinction */
  findByIdAndUser(id: string, userId: string): Promise<PendingUserReward | null>
  countPendingByUser(userId: string): Promise<number>
  markClaimedInTx(tx: PrimaTransactionClient, id: string): Promise<void>
  markAllClaimedInTx(tx: PrimaTransactionClient, userId: string): Promise<void>
  findHistoryByUser(userId: string, page: number, limit: number): Promise<{ data: UserReward[]; total: number }>
}

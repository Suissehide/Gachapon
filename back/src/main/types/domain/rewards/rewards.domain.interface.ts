import type {
  PendingUserReward,
  UserRewardWithReward,
} from '../../infra/orm/repositories/user-reward.repository.interface'

export type ClaimResult = {
  tokens: number
  dust: number
  xp: number
  level: number
  pendingRewardsCount: number
}

export interface RewardsDomainInterface {
  getPending(userId: string): Promise<PendingUserReward[]>
  getHistory(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ data: UserRewardWithReward[]; total: number }>
  claimOne(rewardId: string, userId: string): Promise<ClaimResult>
  claimAll(userId: string): Promise<ClaimResult | null>
}

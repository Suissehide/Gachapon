import type { RewardSource, UserReward } from '../../../../generated/client'
import type { CardRarity, CardVariant } from '../../../../generated/enums'
import type { UnlockedAchievement } from '../../../domain/achievements/events.types'
import type {
  PendingUserReward,
  UserRewardWithReward,
} from '../../infra/orm/repositories/user-reward.repository.interface'

/** A card actually granted when a reward with a `cardRarity` is claimed.
 *  Shaped to map directly onto the front's PullBatchEntry for the reveal. */
export type ClaimedCard = {
  card: {
    id: string
    name: string
    imageUrl: string | null
    rarity: CardRarity
    variant: CardVariant
    set: { id: string; name: string }
  }
  wasDuplicate: boolean
}

export type ClaimResult = {
  tokens: number
  dust: number
  xp: number
  level: number
  levelBefore: number
  gold: number
  pendingRewardsCount: number
  unlockedAchievements: UnlockedAchievement[]
  cards: ClaimedCard[]
}

export type AddRewardInput = {
  rewardId: string
  source: RewardSource
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
  addRewardToUser(userId: string, input: AddRewardInput): Promise<UserReward>
  grantBulk(input: {
    userIds: string[] | 'ALL'
    tokens: number
    dust: number
    xp: number
    gold: number
    cardRarity?: CardRarity
    label?: string
  }): Promise<{ count: number }>
}

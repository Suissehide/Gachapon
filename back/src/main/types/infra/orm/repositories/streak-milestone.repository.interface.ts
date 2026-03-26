import type { Reward, StreakMilestone } from '../../../../../generated/client'

export type StreakMilestoneWithReward = StreakMilestone & { reward: Reward }

export interface StreakMilestoneRepositoryInterface {
  /** Returns the active milestone with the largest day <= targetDay, or null if none */
  findBestForDay(targetDay: number): Promise<StreakMilestoneWithReward | null>
}

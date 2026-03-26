import type { Reward, StreakMilestone } from '../../../../../generated/client'

export type StreakMilestoneWithReward = StreakMilestone & { reward: Reward }

export interface StreakMilestoneRepositoryInterface {
  /** Returns the active milestone with day === targetDay and isMilestone = true, or null */
  findExactMilestoneForDay(targetDay: number): Promise<StreakMilestoneWithReward | null>
  /** Returns the day = 0 default milestone (always exists after migration), or null */
  findDefault(): Promise<StreakMilestoneWithReward | null>
  /** Returns all active milestones (day > 0) ordered by day asc */
  findAllActive(): Promise<StreakMilestoneWithReward[]>
}

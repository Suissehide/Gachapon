import type { StreakMilestone } from '../../../../../generated/client'
import type { LocalizedReward } from '../localized'

export type StreakMilestoneWithReward = StreakMilestone & {
  reward: LocalizedReward
}

export interface StreakMilestoneRepositoryInterface {
  /** Returns the active milestone with day === targetDay and isMilestone = true, or null */
  findExactMilestoneForDay(
    targetDay: number,
  ): Promise<StreakMilestoneWithReward | null>
  /** Returns the active day = 0 default milestone, or null */
  findDefault(): Promise<StreakMilestoneWithReward | null>
  /** Returns all active milestones (day > 0) ordered by day asc */
  findAllActive(): Promise<StreakMilestoneWithReward[]>
  findByDay(day: number): Promise<StreakMilestone | null>
  findByIdWithReward(id: string): Promise<StreakMilestoneWithReward | null>
  create(data: {
    day: number
    isMilestone: boolean
    isActive: boolean
    rewardId: string
  }): Promise<StreakMilestoneWithReward>
  update(id: string, data: Partial<{ isActive: boolean }>): Promise<void>
}

import type { UnlockedAchievement } from '../../../domain/achievements/events.types'

export type RecycleInput = {
  cardId: string
  quantity: number
  variant: 'NORMAL' | 'BRILLIANT' | 'HOLOGRAPHIC'
}

export type RecycleResult = {
  dustEarned: number
  newDustTotal: number
  unlockedAchievements: UnlockedAchievement[]
}

export interface ICollectionDomain {
  recycleCard(userId: string, input: RecycleInput): Promise<RecycleResult>
}

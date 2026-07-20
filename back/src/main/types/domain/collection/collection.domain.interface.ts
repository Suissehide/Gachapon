import type { UnlockedAchievement } from '../../../domain/achievements/events.types'
import type { CardRarity } from '../gacha/gacha.types'

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

export type RecycleAllResult = {
  dustEarned: number
  cardsRecycled: number
  newDustTotal: number
  unlockedAchievements: UnlockedAchievement[]
}

export interface ICollectionDomain {
  recycleCard(userId: string, input: RecycleInput): Promise<RecycleResult>
  recycleAllBelow(
    userId: string,
    maxRarity: CardRarity,
  ): Promise<RecycleAllResult>
}

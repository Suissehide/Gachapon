import type { PrimaTransactionClient } from '../../types/infra/orm/client'
import type { AchievementEvent, UnlockedAchievement } from './events.types'

export interface AchievementsDomainInterface {
  track(
    tx: PrimaTransactionClient,
    userId: string,
    event: AchievementEvent,
  ): Promise<UnlockedAchievement[]>

  listForUser(userId: string): Promise<AchievementWithProgress[]>

  listFamilies(
    userId: string,
  ): Promise<Array<{ family: string; total: number; unlocked: number }>>
}

export interface AchievementWithProgress {
  key: string
  name: string
  description: string
  family: string | null
  tier: number
  hidden: boolean
  iconKey: string | null
  sortOrder: number
  progress: number
  threshold: number
  unlocked: boolean
  unlockedAt: Date | null
  reward: {
    tokens: number
    dust: number
    xp: number
    cardRarity: string | null
  } | null
}

import type { UnlockedAchievement } from '../../../domain/achievements/events.types'
import type { PrimaTransactionClient } from '../../infra/orm/client'

export interface StreakDomainInterface {
  updateStreak(
    userId: string,
    tx: PrimaTransactionClient,
  ): Promise<UnlockedAchievement[]>
}

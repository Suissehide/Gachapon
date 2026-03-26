import type { PrimaTransactionClient } from '../../infra/orm/client'

export interface StreakDomainInterface {
  updateStreak(userId: string, tx: PrimaTransactionClient): Promise<void>
}

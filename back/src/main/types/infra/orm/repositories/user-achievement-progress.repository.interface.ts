import type { UserAchievementProgress } from '../../../../../generated/client'
import type { PrimaTransactionClient } from '../client'

export interface UserAchievementProgressRepositoryInterface {
  incrementInTx(
    tx: PrimaTransactionClient,
    userId: string,
    achievementId: string,
    delta: number,
  ): Promise<UserAchievementProgress>

  upsertInTx(
    tx: PrimaTransactionClient,
    userId: string,
    achievementId: string,
    progress: number,
  ): Promise<UserAchievementProgress>

  findByUserId(userId: string): Promise<UserAchievementProgress[]>
}

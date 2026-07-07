import type { UserQuest } from '../../../../../generated/client'
import type { PrimaTransactionClient } from '../client'

export interface IUserQuestRepository {
  /**
   * Returns all UserQuest rows for a user across one or more periodKeys.
   * Used by getStateForUser to load current progress.
   */
  findByUserAndPeriodKeys(
    userId: string,
    periodKeys: string[],
  ): Promise<UserQuest[]>

  /**
   * Creates UserQuest rows for quests that don't have an existing row yet.
   * Silently skips rows that already exist (idempotent lazy-init).
   */
  createManySkipDuplicates(
    data: Array<{ userId: string; questId: string; periodKey: string }>,
  ): Promise<void>

  /**
   * Upserts a UserQuest row inside an existing transaction.
   * The caller is responsible for computing the correct progress/completed state.
   */
  upsertInTx(
    tx: PrimaTransactionClient,
    data: {
      userId: string
      questId: string
      periodKey: string
      progress: number
      completed: boolean
      completedAt: Date | null
    },
  ): Promise<UserQuest>

  /**
   * Returns a single UserQuest by its composite unique key, within a transaction.
   * Returns null if not found.
   */
  findUniqueInTx(
    tx: PrimaTransactionClient,
    key: { userId: string; questId: string; periodKey: string },
  ): Promise<UserQuest | null>
}

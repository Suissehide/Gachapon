import type { AchievementEvent } from '../../../domain/achievements/events.types'
import type { PrimaTransactionClient } from '../../infra/orm/client'

export interface QuestReward {
  tokens: number
  dust: number
  xp: number
  gold: number
}

export interface QuestStateItem {
  key: string
  name: string
  description: string
  progress: number
  target: number
  completed: boolean
  reward: QuestReward | null
}

export interface QuestState {
  weekly: QuestStateItem[]
  /** True when all 3 weekly quests for the current period are completed AND the bonus reward has been granted. */
  weeklyBonusCompleted: boolean
  oneshot: QuestStateItem[]
}

export interface IQuestsDomain {
  /**
   * Called inside an existing transaction after a business event (pull, combat, etc.).
   *
   * FAIL-SAFE: quest errors are caught and logged — they never propagate to the
   * caller's transaction, EXCEPT Prisma serialization errors (P2034) which are
   * re-thrown so the caller's retry loop can handle them.
   */
  trackInTx(
    tx: PrimaTransactionClient,
    userId: string,
    event: AchievementEvent,
  ): Promise<void>

  /**
   * Returns the current quest state for a user, lazy-initialising missing UserQuest
   * rows for the current week and oneshot quests.
   * Must NOT be called inside a transaction.
   */
  getStateForUser(userId: string): Promise<QuestState>
}

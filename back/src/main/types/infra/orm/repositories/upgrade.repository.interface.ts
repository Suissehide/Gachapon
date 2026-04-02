import type {
  UpgradeConfig,
  UserUpgrade,
} from '../../../../../generated/client'
import type { UserUpgradeEffects } from '../../../domain/economy/economy.types'
import type { PrimaTransactionClient } from '../client'

export interface IUpgradeRepository {
  getEffectsForUser(userId: string): Promise<UserUpgradeEffects>
  findAllConfigs(): Promise<UpgradeConfig[]>
  findUserUpgradesByUserId(userId: string): Promise<UserUpgrade[]>
  findUserUpgradeByType(
    userId: string,
    type: string,
  ): Promise<UserUpgrade | null>
  findConfigByTypeLevel(
    type: string,
    level: number,
  ): Promise<UpgradeConfig | null>
  bulkUpdateConfigs(
    upgrades: {
      type: string
      level: number
      effect: number
      dustCost: number
    }[],
  ): Promise<void>
  bulkUpdateConfigsInTx(
    tx: PrimaTransactionClient,
    upgrades: {
      type: string
      level: number
      effect: number
      dustCost: number
    }[],
  ): Promise<void>
  upsertUserUpgradeInTx(
    tx: PrimaTransactionClient,
    userId: string,
    type: string,
    level: number,
  ): Promise<UserUpgrade>
  decrementUserDustInTx(
    tx: PrimaTransactionClient,
    userId: string,
    amount: number,
  ): Promise<{ newDustTotal: number }>
}

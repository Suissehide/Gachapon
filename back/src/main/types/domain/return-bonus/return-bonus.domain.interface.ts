import type { ReturnChestAmounts } from '../../../domain/return-bonus/return-bonus-rules'
import type { PrimaTransactionClient } from '../../infra/orm/client'

export interface IReturnBonusDomain {
  /** Pose le coffre si l'écart atteint le seuil et qu'aucun coffre n'attend déjà. */
  grantInTx(
    tx: PrimaTransactionClient,
    userId: string,
    dayGap: number,
  ): Promise<void>
  findPending(userId: string): Promise<ReturnChestAmounts | null>
}

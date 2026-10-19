import type { ReturnChestAmounts } from '../../../domain/return-bonus/return-bonus-rules'
import type { PrimaTransactionClient } from '../../infra/orm/client'

/** `tokens` et `combatPoints` : soldes après crédit. */
export type ReturnChestClaim = {
  tokens: number
  combatPoints: number
  gained: ReturnChestAmounts
}

export interface IReturnBonusDomain {
  /** Pose le coffre si l'écart atteint le seuil et qu'aucun coffre n'attend déjà. */
  grantInTx(
    tx: PrimaTransactionClient,
    userId: string,
    dayGap: number,
  ): Promise<void>
  findPending(userId: string): Promise<ReturnChestAmounts | null>
  /** Supprime le coffre et le crédite ; 404 s'il n'y en a pas (idempotent). */
  claim(userId: string): Promise<ReturnChestClaim>
}

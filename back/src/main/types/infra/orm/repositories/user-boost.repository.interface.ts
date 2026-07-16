import type { CardRarity, UserBoost } from '../../../../../generated/client'
import type { PrimaTransactionClient } from '../client'

export type CreateUserBoostData =
  | {
      userId: string
      weightMultiplier: number
      weightRarity: CardRarity
      pullsRemaining: number
    }
  | {
      userId: string
      guaranteedRarity: CardRarity
      pullsRemaining: number
    }

export interface IUserBoostRepository {
  findActiveByUser(userId: string): Promise<UserBoost[]>
  findActiveByUserInTx(
    tx: PrimaTransactionClient,
    userId: string,
  ): Promise<UserBoost[]>
  createInTx(
    tx: PrimaTransactionClient,
    data: CreateUserBoostData,
  ): Promise<UserBoost>
  decrementInTx(
    tx: PrimaTransactionClient,
    id: string,
    opts?: { satisfied?: boolean; by?: number },
  ): Promise<UserBoost>
  extendInTx(
    tx: PrimaTransactionClient,
    id: string,
    by: number,
  ): Promise<UserBoost>
}

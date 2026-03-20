import type { UserCardWithCard } from '../../../domain/gacha/gacha.types'
import type { PrimaTransactionClient } from '../client'

export interface IUserCardRepository {
  findByUser(userId: string): Promise<UserCardWithCard[]>
  /** Incrémente quantity (ou crée). Retourne si c'était un doublon. */
  upsert(userId: string, cardId: string): Promise<{ wasDuplicate: boolean }>
  /** Décrémente quantity. Supprime si quantity devient 0. */
  decrementOrDelete(
    userId: string,
    cardId: string,
  ): Promise<{ quantityLeft: number }>
  /** Must be called inside a SERIALIZABLE transaction. */
  upsertInTx(
    tx: PrimaTransactionClient,
    userId: string,
    cardId: string,
  ): Promise<{ wasDuplicate: boolean }>
}

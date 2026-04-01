import type { CardVariant, UserCardWithCard } from '../../../domain/gacha/gacha.types'
import type { PrimaTransactionClient } from '../client'

export interface IUserCardRepository {
  findByUser(userId: string): Promise<UserCardWithCard[]>
  upsert(userId: string, cardId: string, variant: CardVariant): Promise<{ wasDuplicate: boolean }>
  decrementOrDelete(userId: string, cardId: string, variant: CardVariant): Promise<{ quantityLeft: number }>
  upsertInTx(tx: PrimaTransactionClient, userId: string, cardId: string, variant: CardVariant): Promise<{ wasDuplicate: boolean }>
  countByUser(userId: string): Promise<number>
  countLegendaryByUser(userId: string): Promise<number>
  findForScoring(userIds: string[]): Promise<{ userId: string; variant: string; quantity: number; card: { rarity: string } }[]>
  recycleInTx(tx: PrimaTransactionClient, userId: string, cardId: string, variant: string, quantity: number): Promise<void>
}

import type { UserCardWithCard } from '../../../domain/gacha/gacha.types'

export interface IUserCardRepository {
  findByUser(userId: string): Promise<UserCardWithCard[]>
  /** Incrémente quantity (ou crée). Retourne si c'était un doublon. */
  upsert(userId: string, cardId: string): Promise<{ wasDuplicate: boolean }>
  /** Décrémente quantity. Supprime si quantity devient 0. */
  decrementOrDelete(userId: string, cardId: string): Promise<{ quantityLeft: number }>
}

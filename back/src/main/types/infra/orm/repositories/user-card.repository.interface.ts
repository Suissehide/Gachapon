import type {
  CardVariant,
  UserCardWithCard,
} from '../../../domain/gacha/gacha.types'
import type { PrimaTransactionClient } from '../client'

export interface IUserCardRepository {
  findByUser(userId: string): Promise<UserCardWithCard[]>
  upsertInTx(
    tx: PrimaTransactionClient,
    userId: string,
    cardId: string,
    variant: CardVariant,
  ): Promise<{ wasDuplicate: boolean; newFinish: boolean }>
  countByUser(userId: string): Promise<number>
  countUniqueBySet(userId: string): Promise<Map<string, number>>
  countLegendaryByUser(userId: string): Promise<number>
  findForScoring(userIds: string[]): Promise<
    {
      userId: string
      variant: CardVariant
      quantity: number
      card: { rarity: string }
    }[]
  >
}

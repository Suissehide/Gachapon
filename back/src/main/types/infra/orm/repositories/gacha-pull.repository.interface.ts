import type { GachaPullEntity, GachaPullWithCard, CardRarity, CardVariant } from '../../../domain/gacha/gacha.types'
import type { PrimaTransactionClient } from '../client'

export type CreateGachaPullInput = {
  userId: string
  cardId: string
  variant: CardVariant
  wasDuplicate: boolean
  dustEarned: number
}

export type RecentPullEntry = {
  username: string
  cardName: string
  rarity: CardRarity
  variant: CardVariant
  cardId: string
  imageUrl: string | null
  setName: string
  pulledAt: Date
}

export interface IGachaPullRepository {
  create(data: CreateGachaPullInput): Promise<GachaPullEntity>
  createInTx(
    tx: PrimaTransactionClient,
    data: CreateGachaPullInput,
  ): Promise<GachaPullEntity>
  findByUser(
    userId: string,
    pagination: { skip: number; take: number },
  ): Promise<{ pulls: GachaPullWithCard[]; total: number }>
  findRecent(limit: number): Promise<RecentPullEntry[]>
  countByUser(userId: string): Promise<number>
  sumDustEarnedByUser(userId: string): Promise<number>
}

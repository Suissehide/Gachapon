import type { GachaPullEntity, GachaPullWithCard } from '../../../domain/gacha/gacha.types'
import type { PrimaTransactionClient } from '../client'
import type { CardVariant } from '../../../domain/gacha/gacha.types'

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
  rarity: string
  variant: string
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
}

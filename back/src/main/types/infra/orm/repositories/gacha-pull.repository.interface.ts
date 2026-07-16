import type {
  CardRarity,
  CardVariant,
  GachaPullEntity,
  GachaPullWithCard,
} from '../../../domain/gacha/gacha.types'
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

export type FindRecentOpts = {
  before?: Date
  teamId?: string
  // Restrict the feed to a subset of rarities (used to surface only
  // EPIC/LEGENDARY pulls in the live feed without flooding it).
  rarities?: CardRarity[]
}

export type RecentPullPage = {
  entries: RecentPullEntry[]
  hasMore: boolean
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
  findRecent(limit: number, opts?: FindRecentOpts): Promise<RecentPullPage>
  countByUser(userId: string): Promise<number>
}

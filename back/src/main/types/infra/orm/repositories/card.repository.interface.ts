import type {
  CardRarity,
  CardSetEntity,
  CardWithSet,
} from '../../../domain/gacha/gacha.types'
import type { PrimaTransactionClient } from '../client'

export interface ICardRepository {
  findById(id: string): Promise<CardWithSet | null>
  findAllActive(): Promise<CardWithSet[]>
  findAll(filter?: {
    setId?: string
    rarity?: CardRarity
  }): Promise<CardWithSet[]>
  findActiveSets(): Promise<CardSetEntity[]>
  findAllSets(): Promise<CardSetEntity[]>
  findSetById(id: string): Promise<CardSetEntity | null>
  findActiveForPullInTx(
    tx: PrimaTransactionClient,
    forceLegendary: boolean,
  ): Promise<CardWithSet[]>
  create(data: {
    name: string
    setId: string
    rarity: CardRarity
    dropWeight: number
    imageUrl: string
  }): Promise<CardWithSet>
  update(
    id: string,
    data: Partial<{
      name: string
      rarity: CardRarity
      dropWeight: number
      setId: string
      imageUrl: string | null
    }>,
  ): Promise<CardWithSet>
  delete(id: string): Promise<void>
  createSet(data: {
    name: string
    description?: string
    isActive?: boolean
  }): Promise<CardSetEntity>
  updateSet(
    id: string,
    data: { name?: string; description?: string; isActive?: boolean },
  ): Promise<CardSetEntity>
  deleteSet(id: string): Promise<void>
  findAllSetsWithCount(): Promise<
    (CardSetEntity & { _count: { cards: number } })[]
  >
  findAllForMedia(): Promise<
    { imageUrl: string | null; id: string; name: string; rarity: CardRarity }[]
  >
  findByImageUrls(
    urls: string[],
  ): Promise<{ name: string; imageUrl: string | null }[]>
  updateManyImageUrl(oldUrl: string, newUrl: string): Promise<void>
}

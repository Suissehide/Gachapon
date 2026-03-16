import type {
  CardRarity,
  CardSetEntity,
  CardWithSet,
} from '../../../domain/gacha/gacha.types'

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
}

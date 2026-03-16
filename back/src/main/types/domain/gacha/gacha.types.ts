import type {
  Card,
  CardRarity,
  CardSet,
  GachaPull,
  UserCard,
} from '../../../../generated/client'

export type { CardRarity } from '../../../../generated/client'

export type CardEntity = Card
export type CardSetEntity = CardSet
export type UserCardEntity = UserCard
export type GachaPullEntity = GachaPull

export type CardWithSet = Card & { set: CardSet }
export type UserCardWithCard = UserCard & { card: CardWithSet }
export type GachaPullWithCard = GachaPull & { card: CardWithSet }

export const DUST_BY_RARITY: Record<CardRarity, number> = {
  COMMON: 5,
  UNCOMMON: 15,
  RARE: 50,
  EPIC: 150,
  LEGENDARY: 500,
}

export type PullResult = {
  pull: GachaPullEntity
  card: CardWithSet
  wasDuplicate: boolean
  dustEarned: number
  tokensRemaining: number
  pityCurrent: number
}

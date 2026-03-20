import type {
  Card,
  CardSet,
  GachaPull,
  UserCard,
} from '../../../../generated/client'

export type { CardRarity, CardVariant } from '../../../../generated/client'

export type CardEntity = Card
export type CardSetEntity = CardSet
export type UserCardEntity = UserCard
export type GachaPullEntity = GachaPull

export type CardWithSet = Card & { set: CardSet }
export type UserCardWithCard = UserCard & { card: CardWithSet }
export type GachaPullWithCard = GachaPull & { card: CardWithSet }

export type PullResult = {
  pull: GachaPullEntity
  card: CardWithSet
  wasDuplicate: boolean
  dustEarned: number
  tokensRemaining: number
  pityCurrent: number
}

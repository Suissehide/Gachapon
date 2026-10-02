import type {
  CardElement,
  CardRarity,
  CardVariant,
} from '../../../../generated/client'

/** Rareté de départ d'un cran (LEGENDARY exclue). */
export type AlchemyFromRarity = Exclude<CardRarity, 'LEGENDARY'>

/** Pile de doublons NORMAL candidate : `available` = quantity − 1. */
export type AlchemyStack = {
  userCardId: string
  cardId: string
  name: string
  imageUrl: string | null
  rarity: CardRarity
  element: CardElement | null
  available: number
}

export type AlchemyPick = { userCardId: string; amount: number }

export type AlchemyTier = {
  fromRarity: AlchemyFromRarity
  toRarity: CardRarity
  cost: number
  candidates: AlchemyStack[]
  maxTransmutations: number
  suggestedPicks: AlchemyPick[] | null
}

export type AlchemyBoard = { tiers: AlchemyTier[] }

export type TransmuteResult = {
  card: {
    id: string
    name: string
    imageUrl: string | null
    rarity: CardRarity
    element: CardElement | null
    variant: CardVariant
    set: { id: string; name: string }
  }
  isNew: boolean
}

export interface IAlchemyDomain {
  board(userId: string): Promise<AlchemyBoard>
  transmute(
    userId: string,
    fromRarity: AlchemyFromRarity,
    picks: AlchemyPick[],
  ): Promise<TransmuteResult>
}

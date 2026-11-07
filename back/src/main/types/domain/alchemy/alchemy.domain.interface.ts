import type {
  CardArchetype,
  CardElement,
  CardRarity,
  CardVariant,
} from '../../../../generated/client'
import type { UnlockedAchievement } from '../../../domain/achievements/events.types'

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
  /** Nom localisé du set (client Prisma étendu). */
  setName: string
  archetype: CardArchetype
  passiveKey: string | null
  palier: number
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
  /** Sélection auto pour ALCHEMY_BATCH_SIZE transmutations ; null si impossible. */
  suggestedBatchPicks: AlchemyPick[] | null
}

export type AlchemyBoard = { tiers: AlchemyTier[] }

export type TransmutedCard = {
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

export type TransmuteResult = {
  /** Une entrée par transmutation, dans l'ordre du tirage. */
  results: TransmutedCard[]
  unlockedAchievements: UnlockedAchievement[]
}

export interface IAlchemyDomain {
  board(userId: string): Promise<AlchemyBoard>
  transmute(
    userId: string,
    fromRarity: AlchemyFromRarity,
    picks: AlchemyPick[],
    count: number,
  ): Promise<TransmuteResult>
}

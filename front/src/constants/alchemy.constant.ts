import type { UnlockedAchievement } from './achievements.constant.ts'
import type { CardElement, CardRarity, CardVariant } from './card.constant.ts'

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
  level: number
  setName: string
  available: number
}

// Littéraux complets : Tailwind ne voit pas les classes construites.
export const ALCHEMY_RARITY_BG: Record<CardRarity, string> = {
  COMMON: 'bg-rarity-common',
  UNCOMMON: 'bg-rarity-uncommon',
  RARE: 'bg-rarity-rare',
  EPIC: 'bg-rarity-epic',
  LEGENDARY: 'bg-rarity-legendary',
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
  unlockedAchievements: UnlockedAchievement[]
}

export const ALCHEMY_ROUTES = {
  board: '/alchemy',
  transmute: '/alchemy/transmute',
} as const

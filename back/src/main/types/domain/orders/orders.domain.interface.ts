import type {
  CardElement,
  CardRarity,
  CardVariant,
} from '../../../../generated/client'

/** Une ligne de commande : `quantity` cartes de `rarity`, filtrées au plus par
 *  un élément OU un set. */
export type OrderLine = {
  quantity: number
  rarity: CardRarity
  element?: CardElement
  setId?: string
}

export type OrderReward = { dust: number; gold: number; tokens: number }

export type OrderRewardConfig = {
  dustByRarity: Record<CardRarity, number>
  tokensByRarity: Record<CardRarity, number>
  dustBase: number
  dustMult: number
  goldBase: number
  goldMult: number
}

/** Ce que le matching sait d'une carte : de quoi tester une ligne. */
export type MatchableCard = {
  rarity: CardRarity
  element: CardElement | null
  setId: string
}

export type MatchableUserCard = {
  id: string
  quantity: number
  variant: CardVariant
  card: MatchableCard
}

export type DeliveryPick = {
  lineIndex: number
  userCardId: string
  amount: number
}

/** Pile de doublons NORMAL : `available` = quantity − 1. */
export type DuplicateStack = MatchableCard & {
  userCardId: string
  cardId: string
  available: number
  dropWeight: number
}

export type PoolCard = MatchableCard & { id: string; dropWeight: number }

export type Rng = () => number

export type OrderCandidate = {
  userCardId: string
  cardId: string
  name: string
  imageUrl: string | null
  rarity: CardRarity
  element: CardElement | null
  available: number
}

export type OrderLineView = OrderLine & {
  setName: string | null
  candidates: OrderCandidate[]
}

export type OrderView = {
  id: string
  client: {
    id: string
    name: string
    imageUrl: string | null
    rarity: CardRarity
    element: CardElement | null
    setName: string
  }
  lines: OrderLineView[]
  reward: OrderReward
  suggestedPicks: DeliveryPick[] | null
  deliverable: boolean
}

export type OrderSlotView = {
  slot: number
  order: OrderView | null
  /** ISO — arrivée du prochain client ; null si une commande est ouverte ou si
   *  le plafond du jour est atteint. */
  nextAt: string | null
}

export type OrdersBoard = {
  slots: OrderSlotView[]
  deliveriesLeft: number
  freeDismissAvailable: boolean
}

export interface IOrdersDomain {
  list(userId: string): Promise<OrdersBoard>
  deliver(
    userId: string,
    orderId: string,
    picks: DeliveryPick[],
  ): Promise<{ reward: OrderReward }>
  dismiss(userId: string, orderId: string): Promise<{ free: boolean }>
}

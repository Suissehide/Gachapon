import type { CardElement, CardRarity } from './card.constant.ts'

export type DeliveryPick = {
  lineIndex: number
  userCardId: string
  amount: number
}

export type OrderCandidate = {
  userCardId: string
  cardId: string
  name: string
  imageUrl: string | null
  rarity: CardRarity
  element: CardElement | null
  available: number
}

export type OrderLineView = {
  quantity: number
  rarity: CardRarity
  element?: CardElement
  setId?: string
  setName: string | null
  candidates: OrderCandidate[]
}

export type OrderReward = { dust: number; gold: number; tokens: number }

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
  nextAt: string | null
}

export type OrdersBoard = {
  slots: OrderSlotView[]
  deliveriesLeft: number
  freeDismissAvailable: boolean
}

export const ORDERS_ROUTES = {
  board: '/orders',
  deliver: (orderId: string) => `/orders/${orderId}/deliver`,
  dismiss: (orderId: string) => `/orders/${orderId}/dismiss`,
} as const

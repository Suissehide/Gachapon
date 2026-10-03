import type { TFunction } from 'i18next'

import type { CardElement, CardRarity } from './card.constant.ts'

// Littéraux complets : Tailwind ne voit pas les classes construites.
export const ORDER_RARITY_DOT: Record<CardRarity, string> = {
  COMMON: 'bg-rarity-common',
  UNCOMMON: 'bg-rarity-uncommon',
  RARE: 'bg-rarity-rare',
  EPIC: 'bg-rarity-epic',
  LEGENDARY: 'bg-rarity-legendary',
}

/** « Rare · Eau » ou « Épique · <set> » — rareté puis filtre de la ligne. */
export const orderLineLabel = (t: TFunction, line: OrderLineView) =>
  [
    t(`common:rarity.${line.rarity.toLowerCase()}`),
    line.element && t(`common:elements.${line.element.toLowerCase()}`),
    line.setName,
  ]
    .filter(Boolean)
    .join(' · ')

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
  setName: string
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

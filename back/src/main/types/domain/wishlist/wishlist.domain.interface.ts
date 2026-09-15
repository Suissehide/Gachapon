import type { CardElement } from '../../../../generated/client'

export interface WishlistCardInfo {
  id: string
  name: string
  imageUrl: string | null
  rarity: string
  element: CardElement | null
  set: { id: string; name: string }
  /** Prix en poussière, hors remise de boutique (le vœu est à plein tarif). */
  price: number
}

export interface WishlistStatus {
  /** Emplacements disponibles : 2 + le nœud « Collectionneur ». */
  slots: number
  cards: WishlistCardInfo[]
}

export interface PurchaseWishlistResult {
  card: WishlistCardInfo
  wasDuplicate: boolean
  dustSpent: number
  newDustBalance: number
}

export interface IWishlistDomain {
  getStatus(userId: string): Promise<WishlistStatus>
  addWish(userId: string, cardId: string): Promise<void>
  removeWish(userId: string, cardId: string): Promise<void>
  purchase(userId: string, cardId: string): Promise<PurchaseWishlistResult>
}

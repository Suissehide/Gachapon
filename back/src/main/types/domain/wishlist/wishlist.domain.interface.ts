export interface WishlistCardInfo {
  id: string
  name: string
  imageUrl: string | null
  rarity: string
  set: { id: string; name: string }
}

export interface WishlistStatus {
  card: WishlistCardInfo | null
  price: number | null
  availableAt: string | null
  cooldownDays: number
}

export interface PurchaseWishlistResult {
  card: WishlistCardInfo
  wasDuplicate: boolean
  dustSpent: number
  newDustBalance: number
  availableAt: string
}

export interface IWishlistDomain {
  getStatus(userId: string): Promise<WishlistStatus>
  setWish(userId: string, cardId: string): Promise<void>
  purchase(userId: string): Promise<PurchaseWishlistResult>
}

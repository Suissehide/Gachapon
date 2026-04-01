import type { ShopItem } from '../../../../../generated/client'

export type CreateShopItemInput = {
  name: string
  description: string
  type: 'TOKEN_PACK' | 'BOOST' | 'COSMETIC'
  dustCost: number
  value: Record<string, unknown>
  isActive?: boolean
}

export type UpdateShopItemInput = Partial<CreateShopItemInput>

export interface IShopItemRepository {
  findAll(): Promise<ShopItem[]>
  findActive(): Promise<ShopItem[]>
  findById(id: string): Promise<ShopItem | null>
  create(data: CreateShopItemInput): Promise<ShopItem>
  update(id: string, data: UpdateShopItemInput): Promise<ShopItem>
  delete(id: string): Promise<void>
}

import type { LocalizedShopItem } from '../localized'

export type CreateShopItemInput = {
  name: string
  description: string
  type: 'TOKEN_PACK' | 'ENERGY_PACK' | 'BOOST' | 'COSMETIC' | 'MACHINE'
  cost: number
  currency?: 'DUST' | 'GOLD'
  value: Record<string, unknown>
  isActive?: boolean
}

export type UpdateShopItemInput = Partial<CreateShopItemInput>

export interface IShopItemRepository {
  findAll(): Promise<LocalizedShopItem[]>
  findActive(): Promise<LocalizedShopItem[]>
  findById(id: string): Promise<LocalizedShopItem | null>
  create(data: CreateShopItemInput): Promise<LocalizedShopItem>
  update(id: string, data: UpdateShopItemInput): Promise<LocalizedShopItem>
  delete(id: string): Promise<void>
}

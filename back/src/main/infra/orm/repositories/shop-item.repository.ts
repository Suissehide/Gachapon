import type { IocContainer } from '../../../types/application/ioc'
import type { LocalizedShopItem } from '../../../types/infra/orm/localized'
import type {
  CreateShopItemInput,
  IShopItemRepository,
  UpdateShopItemInput,
} from '../../../types/infra/orm/repositories/shop-item.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class ShopItemRepository implements IShopItemRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  findAll(): Promise<LocalizedShopItem[]> {
    return this.#prisma.shopItem.findMany({ orderBy: { createdAt: 'desc' } })
  }

  findActive(): Promise<LocalizedShopItem[]> {
    return this.#prisma.shopItem.findMany({
      where: { isActive: true },
      orderBy: [{ type: 'asc' }, { cost: 'asc' }],
    })
  }

  findById(id: string): Promise<LocalizedShopItem | null> {
    return this.#prisma.shopItem.findUnique({ where: { id } })
  }

  create(data: CreateShopItemInput): Promise<LocalizedShopItem> {
    return this.#prisma.shopItem.create({ data })
  }

  update(id: string, data: UpdateShopItemInput): Promise<LocalizedShopItem> {
    return this.#prisma.shopItem.update({ where: { id }, data })
  }

  async delete(id: string): Promise<void> {
    await this.#prisma.shopItem.delete({ where: { id } })
  }
}

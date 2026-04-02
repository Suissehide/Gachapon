import type { ShopItem } from '../../../../generated/client'
import type { IocContainer } from '../../../types/application/ioc'
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

  findAll(): Promise<ShopItem[]> {
    return this.#prisma.shopItem.findMany({ orderBy: { createdAt: 'desc' } })
  }

  findActive(): Promise<ShopItem[]> {
    return this.#prisma.shopItem.findMany({
      where: { isActive: true },
      orderBy: [{ type: 'asc' }, { dustCost: 'asc' }],
    })
  }

  findById(id: string): Promise<ShopItem | null> {
    return this.#prisma.shopItem.findUnique({ where: { id } })
  }

  create(data: CreateShopItemInput): Promise<ShopItem> {
    // biome-ignore lint/suspicious/noExplicitAny: Prisma JSON field requires cast
    return this.#prisma.shopItem.create({ data: data as any })
  }

  update(id: string, data: UpdateShopItemInput): Promise<ShopItem> {
    // biome-ignore lint/suspicious/noExplicitAny: Prisma JSON field requires cast
    return this.#prisma.shopItem.update({ where: { id }, data: data as any })
  }

  async delete(id: string): Promise<void> {
    await this.#prisma.shopItem.delete({ where: { id } })
  }
}

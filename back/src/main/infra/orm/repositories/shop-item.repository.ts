import type { IocContainer } from '../../../types/application/ioc'
import type { LocalizedShopItem } from '../../../types/infra/orm/localized'
import type {
  CreateShopItemInput,
  IShopItemRepository,
  UpdateShopItemInput,
} from '../../../types/infra/orm/repositories/shop-item.repository.interface'
import {
  descriptionToBothLocales,
  nameToBothLocales,
} from '../../i18n/monolingual-write'
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
    const { name, description, ...rest } = data
    return this.#prisma.shopItem.create({
      data: {
        // biome-ignore lint/suspicious/noExplicitAny: Prisma JSON field requires cast
        ...(rest as any),
        ...nameToBothLocales(name),
        ...descriptionToBothLocales(description),
      },
    })
  }

  update(id: string, data: UpdateShopItemInput): Promise<LocalizedShopItem> {
    const { name, description, ...rest } = data
    return this.#prisma.shopItem.update({
      where: { id },
      data: {
        // biome-ignore lint/suspicious/noExplicitAny: Prisma JSON field requires cast
        ...(rest as any),
        ...nameToBothLocales(name),
        ...descriptionToBothLocales(description),
      },
    })
  }

  async delete(id: string): Promise<void> {
    await this.#prisma.shopItem.delete({ where: { id } })
  }
}

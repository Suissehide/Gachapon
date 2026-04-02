import Boom from '@hapi/boom'

import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { IocContainer } from '../../types/application/ioc'
import type {
  BuyShopItemResult,
  IShopDomain,
} from '../../types/domain/shop/shop.domain.interface'
import type { IShopItemRepository } from '../../types/infra/orm/repositories/shop-item.repository.interface'

export class ShopDomain implements IShopDomain {
  readonly #shopItemRepository: IShopItemRepository
  readonly #postgresOrm: PostgresOrm

  constructor({ shopItemRepository, postgresOrm }: IocContainer) {
    this.#shopItemRepository = shopItemRepository
    this.#postgresOrm = postgresOrm
  }

  async buy(userId: string, shopItemId: string): Promise<BuyShopItemResult> {
    const item = await this.#shopItemRepository.findById(shopItemId)
    if (!item || !item.isActive) {
      throw Boom.notFound('Item not found')
    }

    const result = await this.#postgresOrm.executeWithTransactionClient(
      async (tx) => {
        const user = await tx.user.findUniqueOrThrow({ where: { id: userId } })
        if (user.dust < item.dustCost) {
          throw Boom.paymentRequired('Not enough dust')
        }

        const purchase = await tx.purchase.create({
          data: { userId, shopItemId, dustSpent: item.dustCost },
        })

        const updated = await tx.user.update({
          where: { id: userId },
          data: { dust: { decrement: item.dustCost } },
        })

        return { purchase, newDustTotal: updated.dust }
      },
      { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 },
    )

    return {
      purchaseId: result.purchase.id,
      dustSpent: item.dustCost,
      newDustTotal: result.newDustTotal,
      item: {
        id: item.id,
        name: item.name,
        type: item.type,
        value: item.value,
      },
    }
  }
}

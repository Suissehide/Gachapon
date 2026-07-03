import Boom from '@hapi/boom'

import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { IocContainer } from '../../types/application/ioc'
import type {
  BuyShopItemResult,
  IShopDomain,
} from '../../types/domain/shop/shop.domain.interface'
import type { IShopItemRepository } from '../../types/infra/orm/repositories/shop-item.repository.interface'
import type { AchievementsDomainInterface } from '../achievements/achievements.domain.interface'
import type {
  AchievementEvent,
  UnlockedAchievement,
} from '../achievements/events.types'

export class ShopDomain implements IShopDomain {
  readonly #shopItemRepository: IShopItemRepository
  readonly #postgresOrm: PostgresOrm
  readonly #achievementsDomain: AchievementsDomainInterface

  constructor({
    shopItemRepository,
    postgresOrm,
    achievementsDomain,
  }: IocContainer) {
    this.#shopItemRepository = shopItemRepository
    this.#postgresOrm = postgresOrm
    this.#achievementsDomain = achievementsDomain
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

        // Prevent buying the same MACHINE twice
        if (item.type === 'MACHINE') {
          const existing = await tx.purchase.findFirst({
            where: { userId, shopItemId },
          })
          if (existing) {
            throw Boom.conflict('Machine already owned')
          }
        }

        const purchase = await tx.purchase.create({
          data: { userId, shopItemId, dustSpent: item.dustCost },
        })

        const updateData: Record<string, unknown> = {
          dust: { decrement: item.dustCost },
        }
        if (item.type === 'TOKEN_PACK') {
          const value = item.value as { tokens: number }
          updateData.tokens = { increment: value.tokens }
        }

        const updated = await tx.user.update({
          where: { id: userId },
          data: updateData,
        })

        // Track achievement events
        const events: AchievementEvent[] = []
        if (item.type === 'MACHINE') {
          const value = item.value as { machineId: string }
          events.push({ kind: 'MACHINE_PURCHASED', machineId: value.machineId })
        }
        events.push({ kind: 'DUST_SPENT', amount: item.dustCost })

        const allUnlocks: UnlockedAchievement[] = []
        for (const e of events) {
          const unlocks = await this.#achievementsDomain.track(tx, userId, e)
          allUnlocks.push(...unlocks)
        }

        return {
          purchase,
          newDustTotal: updated.dust,
          newTokenTotal: updated.tokens,
          unlockedAchievements: allUnlocks,
        }
      },
      { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 },
    )

    return {
      purchaseId: result.purchase.id,
      dustSpent: item.dustCost,
      newDustTotal: result.newDustTotal,
      newTokenTotal: result.newTokenTotal,
      unlockedAchievements: result.unlockedAchievements,
      item: {
        id: item.id,
        name: item.name,
        type: item.type,
        value: item.value,
      },
    }
  }
}

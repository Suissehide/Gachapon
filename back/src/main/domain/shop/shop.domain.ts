import Boom from '@hapi/boom'

import { CardRarity, type ShopItem } from '../../../generated/client'
import type { PostgresOrm } from '../../infra/orm/postgres-client'
import type { IocContainer } from '../../types/application/ioc'
import type {
  BuyShopItemResult,
  IShopDomain,
} from '../../types/domain/shop/shop.domain.interface'
import type { PrimaTransactionClient } from '../../types/infra/orm/client'
import type { IShopItemRepository } from '../../types/infra/orm/repositories/shop-item.repository.interface'
import type { IUserBoostRepository } from '../../types/infra/orm/repositories/user-boost.repository.interface'
import type { AchievementsDomainInterface } from '../achievements/achievements.domain.interface'
import type { UnlockedAchievement } from '../achievements/events.types'

type BoostValue = {
  multiplier?: number
  rarity?: string
  pulls?: number
  guaranteedRarity?: string
}

export class ShopDomain implements IShopDomain {
  readonly #shopItemRepository: IShopItemRepository
  readonly #userBoostRepository: IUserBoostRepository
  readonly #postgresOrm: PostgresOrm
  readonly #achievementsDomain: AchievementsDomainInterface

  constructor({
    shopItemRepository,
    userBoostRepository,
    postgresOrm,
    achievementsDomain,
  }: IocContainer) {
    this.#shopItemRepository = shopItemRepository
    this.#userBoostRepository = userBoostRepository
    this.#postgresOrm = postgresOrm
    this.#achievementsDomain = achievementsDomain
  }

  async buy(userId: string, shopItemId: string): Promise<BuyShopItemResult> {
    const item = await this.#shopItemRepository.findById(shopItemId)
    if (!item || !item.isActive) {
      throw Boom.notFound('Item not found')
    }

    // Validate shop item structure early (before transaction)
    this.#validateShopItem(item)

    const result = await this.#postgresOrm.executeWithTransactionClient(
      async (tx) => {
        const user = await tx.user.findUniqueOrThrow({ where: { id: userId } })
        if (user.dust < item.dustCost) {
          throw Boom.paymentRequired('Not enough dust')
        }

        await this.#checkItemConflicts(tx, userId, shopItemId, item)

        const purchase = await tx.purchase.create({
          data: { userId, shopItemId, dustSpent: item.dustCost },
        })

        const updateData = this.#buildUpdateData(item)
        await this.#applyBoostEffect(tx, userId, item)

        const updated = await tx.user.update({
          where: { id: userId },
          data: updateData,
        })

        const allUnlocks = await this.#trackAchievements(tx, userId, item)

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

  async #checkItemConflicts(
    tx: PrimaTransactionClient,
    userId: string,
    shopItemId: string,
    item: ShopItem,
  ): Promise<void> {
    if (item.type === 'MACHINE') {
      const existing = await tx.purchase.findFirst({
        where: { userId, shopItemId },
      })
      if (existing) {
        throw Boom.conflict('Machine already owned')
      }
    }
    if (item.type === 'BOOST') {
      await this.#checkBoostConflict(tx, userId, item)
    }
  }

  async #checkBoostConflict(
    tx: PrimaTransactionClient,
    userId: string,
    item: ShopItem,
  ): Promise<void> {
    const boostValue = item.value as BoostValue
    const isWeightBoost = boostValue.multiplier != null
    const activeBoosts = await this.#userBoostRepository.findActiveByUserInTx(
      tx,
      userId,
    )
    const conflict = isWeightBoost
      ? activeBoosts.some((b) => b.weightMultiplier != null)
      : activeBoosts.some((b) => b.guaranteedRarity != null)
    if (conflict) {
      throw Boom.conflict('Un boost de ce type est déjà actif')
    }
  }

  #buildUpdateData(item: ShopItem): Record<string, unknown> {
    const updateData: Record<string, unknown> = {
      dust: { decrement: item.dustCost },
    }
    if (item.type === 'TOKEN_PACK') {
      const value = item.value as { tokens: number }
      updateData.tokens = { increment: value.tokens }
    }
    return updateData
  }

  async #applyBoostEffect(
    tx: PrimaTransactionClient,
    userId: string,
    item: ShopItem,
  ): Promise<void> {
    if (item.type !== 'BOOST') {
      return
    }
    const boostValue = item.value as BoostValue

    // Guard: ensure at least one boost type is specified
    if (boostValue.multiplier == null && boostValue.guaranteedRarity == null) {
      throw Boom.internal(
        'BOOST item value has neither multiplier nor guaranteedRarity',
      )
    }

    // Guard: ensure pulls count is positive
    const pulls = boostValue.pulls ?? 0
    if (pulls <= 0) {
      throw Boom.internal('BOOST item value has no positive pulls count')
    }

    if (boostValue.multiplier != null) {
      // Validate rarity for weight boost
      this.#validateRarity(boostValue.rarity)
      await this.#userBoostRepository.createInTx(tx, {
        userId,
        weightMultiplier: boostValue.multiplier,
        weightRarity: boostValue.rarity as CardRarity,
        pullsRemaining: pulls,
      })
    } else if (boostValue.guaranteedRarity != null) {
      // Validate rarity for guaranteed boost
      this.#validateRarity(boostValue.guaranteedRarity)
      await this.#userBoostRepository.createInTx(tx, {
        userId,
        guaranteedRarity: boostValue.guaranteedRarity as CardRarity,
        pullsRemaining: pulls,
      })
    }
  }

  #validateRarity(rarity?: string): void {
    const validRarities = Object.values(CardRarity)
    if (rarity && !validRarities.includes(rarity as CardRarity)) {
      throw Boom.internal(`BOOST item has invalid rarity: ${rarity}`)
    }
  }

  #validateShopItem(item: ShopItem): void {
    if (item.type === 'BOOST') {
      const boostValue = item.value as BoostValue
      // Validate that at least one boost type is specified
      if (
        boostValue.multiplier == null &&
        boostValue.guaranteedRarity == null
      ) {
        throw Boom.internal(
          'BOOST item value has neither multiplier nor guaranteedRarity',
        )
      }
      // Validate that pulls count is positive
      if ((boostValue.pulls ?? 0) <= 0) {
        throw Boom.internal('BOOST item value has no positive pulls count')
      }
    }
  }

  async #trackAchievements(
    tx: PrimaTransactionClient,
    userId: string,
    item: ShopItem,
  ): Promise<UnlockedAchievement[]> {
    const events = []
    if (item.type === 'MACHINE') {
      const value = item.value as { machineId: string }
      events.push({
        kind: 'MACHINE_PURCHASED' as const,
        machineId: value.machineId,
      })
    }
    events.push({ kind: 'DUST_SPENT' as const, amount: item.dustCost })
    const allUnlocks: UnlockedAchievement[] = []
    for (const e of events) {
      const unlocks = await this.#achievementsDomain.track(tx, userId, e)
      allUnlocks.push(...unlocks)
    }
    return allUnlocks
  }
}

import Boom from '@hapi/boom'

import type { IocContainer } from '../../types/application/ioc'
import { retryOnSerialization } from '../shared/retry-serialization'
import {
  isAtTopOfPalier,
  maxLevelInPalier,
  totalDustCost,
  totalGoldCost,
} from './card-leveling.domain'

export class CardLevelingTx {
  readonly #postgresOrm
  readonly #configService

  constructor({ postgresOrm, configService }: IocContainer) {
    this.#postgresOrm = postgresOrm
    this.#configService = configService
  }

  async levelUp(
    userId: string,
    userCardId: string,
    targetLevel: number,
  ): Promise<{
    newLevel: number
    goldSpent: number
    dustSpent: number
    newGold: number
    newDust: number
  }> {
    const c = await this.#configService.getMany(
      'card.goldCostBase',
      'card.goldCostExp',
      'card.dustCostBase',
      'card.dustCostExp',
      'card.rarityMultCommon',
      'card.rarityMultUncommon',
      'card.rarityMultRare',
      'card.rarityMultEpic',
      'card.rarityMultLegendary',
    )
    const rarityMult = {
      COMMON: c['card.rarityMultCommon'],
      UNCOMMON: c['card.rarityMultUncommon'],
      RARE: c['card.rarityMultRare'],
      EPIC: c['card.rarityMultEpic'],
      LEGENDARY: c['card.rarityMultLegendary'],
    }

    return retryOnSerialization(() =>
      this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          const userCard = await tx.userCard.findUnique({
            where: { id: userCardId },
            include: { card: true },
          })
          if (!userCard || userCard.userId !== userId) {
            throw Boom.notFound('UserCard not found')
          }

          const currentLevel = userCard.level
          const palier = userCard.palier
          const palierMax = maxLevelInPalier(palier)

          if (targetLevel <= currentLevel) {
            throw Boom.badRequest(
              `targetLevel (${targetLevel}) must be greater than current level (${currentLevel})`,
            )
          }
          if (targetLevel > palierMax) {
            throw Boom.badRequest(
              `targetLevel (${targetLevel}) exceeds palier cap (${palierMax}) — ascend the card to unlock the next palier`,
            )
          }

          const rarity = userCard.card.rarity
          const goldCost = totalGoldCost(currentLevel, targetLevel, rarity, c['card.goldCostBase'], c['card.goldCostExp'], rarityMult)
          const dustCost = totalDustCost(currentLevel, targetLevel, rarity, c['card.dustCostBase'], c['card.dustCostExp'], rarityMult)

          const user = await tx.user.findUnique({ where: { id: userId } })
          if (!user) {
            throw Boom.notFound('User not found')
          }
          if (user.gold < goldCost) {
            throw Boom.paymentRequired(
              `Not enough gold (need ${goldCost}, have ${user.gold})`,
            )
          }
          if (user.dust < dustCost) {
            throw Boom.paymentRequired(
              `Not enough dust (need ${dustCost}, have ${user.dust})`,
            )
          }

          const updatedUser = await tx.user.update({
            where: { id: userId },
            data: {
              gold: { decrement: goldCost },
              dust: { decrement: dustCost },
            },
          })
          await tx.userCard.update({
            where: { id: userCardId },
            data: { level: targetLevel },
          })

          return {
            newLevel: targetLevel,
            goldSpent: goldCost,
            dustSpent: dustCost,
            newGold: updatedUser.gold,
            newDust: updatedUser.dust,
          }
        },
        { isolationLevel: 'Serializable' },
      ),
    )
  }
}

// Re-export for callers that want to check the top-of-palier condition without depending on the pure module directly
export { isAtTopOfPalier }

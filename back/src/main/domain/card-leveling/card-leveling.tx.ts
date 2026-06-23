import Boom from '@hapi/boom'

import type { IocContainer } from '../../types/application/ioc'
import {
  isAtTopOfPalier,
  maxLevelInPalier,
  totalDustCost,
  totalGoldCost,
} from './card-leveling.domain'

export class CardLevelingTx {
  readonly #postgresOrm

  constructor({ postgresOrm }: IocContainer) {
    this.#postgresOrm = postgresOrm
  }

  levelUp(
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
    return this.#postgresOrm.executeWithTransactionClient(
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
        const goldCost = totalGoldCost(currentLevel, targetLevel, rarity)
        const dustCost = totalDustCost(currentLevel, targetLevel, rarity)

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
    )
  }
}

// Re-export for callers that want to check the top-of-palier condition without depending on the pure module directly
export { isAtTopOfPalier }

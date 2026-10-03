import Boom from '@hapi/boom'

import { errorMessage } from '../../infra/i18n/error-messages'
import type { IocContainer } from '../../types/application/ioc'
import { applyPercentDiscount } from '../shared/discount'
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
  readonly #achievementsDomain
  readonly #skillTreeRepository

  constructor({
    postgresOrm,
    configService,
    achievementsDomain,
    skillTreeRepository,
  }: IocContainer) {
    this.#postgresOrm = postgresOrm
    this.#configService = configService
    this.#achievementsDomain = achievementsDomain
    this.#skillTreeRepository = skillTreeRepository
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
    const effects = await this.#skillTreeRepository.getEffectsForUser(userId)

    return retryOnSerialization(() =>
      this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          const userCard = await tx.userCard.findUnique({
            where: { id: userCardId },
            include: { card: true },
          })
          if (!userCard || userCard.userId !== userId) {
            throw Boom.notFound(errorMessage('collection.userCardNotFound'))
          }

          const currentLevel = userCard.level
          const palier = userCard.palier
          assertTargetLevel(targetLevel, currentLevel, palier)

          const rarity = userCard.card.rarity
          const goldCost = totalGoldCost(
            currentLevel,
            targetLevel,
            rarity,
            c['card.goldCostBase'],
            c['card.goldCostExp'],
            rarityMult,
          )
          const dustCost = applyPercentDiscount(
            totalDustCost(
              currentLevel,
              targetLevel,
              rarity,
              c['card.dustCostBase'],
              c['card.dustCostExp'],
              rarityMult,
            ),
            effects.upgradeDustDiscount,
          )

          const user = await tx.user.findUnique({ where: { id: userId } })
          if (!user) {
            throw Boom.notFound(errorMessage('user.notFound'))
          }
          assertCanAfford(user, goldCost, dustCost)

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

          const levelsGained = targetLevel - currentLevel
          await Promise.all([
            this.#achievementsDomain.track(tx, userId, {
              kind: 'CARD_LEVELED',
              levels: levelsGained,
            }),
            goldCost > 0
              ? this.#achievementsDomain.track(tx, userId, {
                  kind: 'GOLD_SPENT',
                  amount: goldCost,
                })
              : Promise.resolve([]),
          ])

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

function assertTargetLevel(
  targetLevel: number,
  currentLevel: number,
  palier: number,
): void {
  const palierMax = maxLevelInPalier(palier)
  if (targetLevel <= currentLevel) {
    throw Boom.badRequest(
      errorMessage('cardLeveling.targetBelowCurrent', {
        target: targetLevel,
        current: currentLevel,
      }),
    )
  }
  if (targetLevel > palierMax) {
    throw Boom.badRequest(
      errorMessage('cardLeveling.targetExceedsPalierCap', {
        target: targetLevel,
        cap: palierMax,
      }),
    )
  }
}

function assertCanAfford(
  user: { gold: number; dust: number },
  goldCost: number,
  dustCost: number,
): void {
  if (user.gold < goldCost) {
    throw Boom.paymentRequired(
      errorMessage('cardLeveling.notEnoughGold', {
        need: goldCost,
        have: user.gold,
      }),
    )
  }
  if (user.dust < dustCost) {
    throw Boom.paymentRequired(
      errorMessage('cardLeveling.notEnoughDust', {
        need: dustCost,
        have: user.dust,
      }),
    )
  }
}

// Re-export for callers that want to check the top-of-palier condition without depending on the pure module directly
export { isAtTopOfPalier }

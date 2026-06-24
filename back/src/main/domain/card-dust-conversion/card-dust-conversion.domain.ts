import Boom from '@hapi/boom'

import type { IocContainer } from '../../types/application/ioc'
import { retryOnSerialization } from '../shared/retry-serialization'

const DUST_BY_RARITY: Record<
  'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY',
  number
> = {
  COMMON: 5,
  UNCOMMON: 15,
  RARE: 40,
  EPIC: 100,
  LEGENDARY: 300,
}

export class CardDustConversionDomain {
  readonly #postgresOrm
  readonly #skillTreeRepository
  readonly #achievementsDomain

  constructor({
    postgresOrm,
    skillTreeRepository,
    achievementsDomain,
  }: IocContainer) {
    this.#postgresOrm = postgresOrm
    this.#skillTreeRepository = skillTreeRepository
    this.#achievementsDomain = achievementsDomain
  }

  convert(
    userId: string,
    userCardId: string,
    amount: number,
  ): Promise<{ dustEarned: number; remainingQuantity: number }> {
    if (amount < 1) {
      return Promise.reject(Boom.badRequest('amount must be at least 1'))
    }

    return retryOnSerialization(async () => {
      // Read skill multiplier outside the TX — it depends on user-owned
      // SkillNode levels which the conversion does not mutate.
      const upgrades = await this.#skillTreeRepository.getEffectsForUser(userId)
      const dustHarvestMultiplier = upgrades.dustHarvestMultiplier ?? 1

      return this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          const userCard = await tx.userCard.findUnique({
            where: { id: userCardId },
            include: { card: true },
          })
          if (!userCard || userCard.userId !== userId) {
            throw Boom.notFound('UserCard not found')
          }
          if (userCard.quantity - amount < 1) {
            throw Boom.badRequest(
              `Cannot convert ${amount} — would leave 0 copies (have ${userCard.quantity})`,
            )
          }

          const perCopy = DUST_BY_RARITY[userCard.card.rarity]
          const dustEarned = Math.round(perCopy * amount * dustHarvestMultiplier)

          await tx.userCard.update({
            where: { id: userCardId },
            data: { quantity: { decrement: amount } },
          })
          await tx.user.update({
            where: { id: userId },
            data: { dust: { increment: dustEarned } },
          })

          // Track achievement (parity with the legacy collection.recycle path).
          await this.#achievementsDomain.track(tx, userId, {
            kind: 'CARD_RECYCLED',
            amount,
          })

          return {
            dustEarned,
            remainingQuantity: userCard.quantity - amount,
          }
        },
        { isolationLevel: 'Serializable' },
      )
    })
  }
}

import Boom from '@hapi/boom'

import type { IocContainer } from '../../types/application/ioc'

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

  constructor({ postgresOrm }: IocContainer) {
    this.#postgresOrm = postgresOrm
  }

  convert(
    userId: string,
    userCardId: string,
    amount: number,
  ): Promise<{ dustEarned: number; remainingQuantity: number }> {
    if (amount < 1) {
      return Promise.reject(Boom.badRequest('amount must be at least 1'))
    }

    return this.#postgresOrm.executeWithTransactionClient(
      async (tx) => {
        const userCard = await tx.userCard.findUnique({
          where: { id: userCardId },
          include: { card: true },
        })
        if (!userCard || userCard.userId !== userId) {
          throw Boom.notFound('UserCard not found')
        }
        // Must keep at least 1 copy of the card
        if (userCard.quantity - amount < 1) {
          throw Boom.badRequest(
            `Cannot convert ${amount} — would leave 0 copies (have ${userCard.quantity})`,
          )
        }

        const perCopy = DUST_BY_RARITY[userCard.card.rarity]
        const dustEarned = perCopy * amount

        await tx.userCard.update({
          where: { id: userCardId },
          data: { quantity: userCard.quantity - amount },
        })
        await tx.user.update({
          where: { id: userId },
          data: { dust: { increment: dustEarned } },
        })

        return {
          dustEarned,
          remainingQuantity: userCard.quantity - amount,
        }
      },
      { isolationLevel: 'Serializable' },
    )
  }
}

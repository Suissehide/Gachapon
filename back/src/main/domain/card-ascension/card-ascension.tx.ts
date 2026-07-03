import Boom from '@hapi/boom'

import type { IocContainer } from '../../types/application/ioc'
import { isAtTopOfPalier } from '../card-leveling/card-leveling.domain'
import { retryOnSerialization } from '../shared/retry-serialization'

export const MAX_PALIER = 6

export class CardAscensionTx {
  readonly #postgresOrm

  constructor({ postgresOrm }: IocContainer) {
    this.#postgresOrm = postgresOrm
  }

  ascend(
    userId: string,
    userCardId: string,
  ): Promise<{
    newPalier: number
    doublonsSpent: number
    remainingQuantity: number
  }> {
    return retryOnSerialization(() =>
      this.#postgresOrm.executeWithTransactionClient(
        async (tx) => {
          const userCard = await tx.userCard.findUnique({
            where: { id: userCardId },
          })
          if (!userCard || userCard.userId !== userId) {
            throw Boom.notFound('UserCard not found')
          }
          if (userCard.palier >= MAX_PALIER) {
            throw Boom.badRequest(`Card already at max palier (${MAX_PALIER})`)
          }
          if (!isAtTopOfPalier(userCard.level, userCard.palier)) {
            throw Boom.badRequest(
              `Card must be at top of palier (level ${10 * userCard.palier}) to ascend — currently level ${userCard.level}`,
            )
          }
          if (userCard.quantity < 2) {
            throw Boom.badRequest(
              `Need at least 1 duplicate (quantity > 1) to ascend — current quantity is ${userCard.quantity}`,
            )
          }

          const updated = await tx.userCard.update({
            where: { id: userCardId },
            // Atomic decrement: never overwrites a value computed from a stale
            // read. Combined with the Serializable level + outer retry loop,
            // this makes concurrent ascensions safe regardless of isolation.
            data: {
              quantity: { decrement: 1 },
              palier: { increment: 1 },
            },
          })

          return {
            newPalier: updated.palier,
            doublonsSpent: 1,
            remainingQuantity: updated.quantity,
          }
        },
        { isolationLevel: 'Serializable' },
      ),
    )
  }
}

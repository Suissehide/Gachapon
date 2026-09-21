import Boom from '@hapi/boom'

import { errorMessage } from '../../interfaces/http/fastify/errors/messages'
import type { IocContainer } from '../../types/application/ioc'
import type { IDuelDomain } from '../../types/domain/wagers/wagers.domain.interface'
import {
  isAtTopOfPalier,
  MAX_PALIER,
} from '../card-leveling/card-leveling.domain'
import { retryOnSerialization } from '../shared/retry-serialization'

export class CardAscensionTx {
  readonly #postgresOrm
  readonly #duelDomain: IDuelDomain

  constructor({
    postgresOrm,
    duelDomain,
  }: Pick<IocContainer, 'postgresOrm'> & { duelDomain: IDuelDomain }) {
    this.#postgresOrm = postgresOrm
    this.#duelDomain = duelDomain
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
            throw Boom.notFound(errorMessage('collection.userCardNotFound'))
          }
          if (userCard.palier >= MAX_PALIER) {
            throw Boom.badRequest(
              errorMessage('cardAscension.maxPalierReached', {
                max: MAX_PALIER,
              }),
            )
          }
          if (!isAtTopOfPalier(userCard.level, userCard.palier)) {
            throw Boom.badRequest(
              errorMessage('cardAscension.notTopOfPalier', {
                requiredLevel: 10 * userCard.palier,
                currentLevel: userCard.level,
              }),
            )
          }
          if (userCard.quantity < 2) {
            throw Boom.badRequest(
              errorMessage('cardAscension.needDuplicate', {
                quantity: userCard.quantity,
              }),
            )
          }
          await this.#duelDomain.assertCardNotEngagedInTx(
            tx,
            userId,
            userCard.cardId,
            userCard.variant,
          )

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

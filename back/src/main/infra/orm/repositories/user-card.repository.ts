import Boom from '@hapi/boom'

import type { IocContainer } from '../../../types/application/ioc'
import type {
  CardVariant,
  UserCardWithCard,
} from '../../../types/domain/gacha/gacha.types'
import type { PrimaTransactionClient } from '../../../types/infra/orm/client'
import type { IUserCardRepository } from '../../../types/infra/orm/repositories/user-card.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class UserCardRepository implements IUserCardRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  findByUser(userId: string): Promise<UserCardWithCard[]> {
    return this.#prisma.userCard.findMany({
      where: { userId },
      include: { card: { include: { set: true } } },
      orderBy: { obtainedAt: 'desc' },
    }) as Promise<UserCardWithCard[]>
  }

  async upsert(
    userId: string,
    cardId: string,
    variant: CardVariant,
  ): Promise<{ wasDuplicate: boolean }> {
    const existing = await this.#prisma.userCard.findUnique({
      where: { userId_cardId_variant: { userId, cardId, variant } },
    })
    if (existing) {
      await this.#prisma.userCard.update({
        where: { userId_cardId_variant: { userId, cardId, variant } },
        data: { quantity: { increment: 1 } },
      })
      return { wasDuplicate: true }
    }
    await this.#prisma.userCard.create({
      data: { userId, cardId, variant, quantity: 1, obtainedAt: new Date() },
    })
    return { wasDuplicate: false }
  }

  /** Must be called inside a SERIALIZABLE transaction. */
  async upsertInTx(
    tx: PrimaTransactionClient,
    userId: string,
    cardId: string,
    variant: CardVariant,
  ): Promise<{ wasDuplicate: boolean }> {
    const existing = await tx.userCard.findUnique({
      where: { userId_cardId_variant: { userId, cardId, variant } },
    })
    if (existing) {
      await tx.userCard.update({
        where: { userId_cardId_variant: { userId, cardId, variant } },
        data: { quantity: { increment: 1 } },
      })
      return { wasDuplicate: true }
    }
    await tx.userCard.create({
      data: { userId, cardId, variant, quantity: 1, obtainedAt: new Date() },
    })
    return { wasDuplicate: false }
  }

  async decrementOrDelete(
    userId: string,
    cardId: string,
    variant: CardVariant,
  ): Promise<{ quantityLeft: number }> {
    const uc = await this.#prisma.userCard.findUniqueOrThrow({
      where: { userId_cardId_variant: { userId, cardId, variant } },
    })
    if (uc.quantity <= 1) {
      await this.#prisma.userCard.delete({
        where: { userId_cardId_variant: { userId, cardId, variant } },
      })
      return { quantityLeft: 0 }
    }
    const updated = await this.#prisma.userCard.update({
      where: { userId_cardId_variant: { userId, cardId, variant } },
      data: { quantity: { decrement: 1 } },
    })
    return { quantityLeft: updated.quantity }
  }

  countByUser(userId: string): Promise<number> {
    return this.#prisma.userCard.count({ where: { userId } })
  }

  countLegendaryByUser(userId: string): Promise<number> {
    return this.#prisma.userCard.count({
      where: { userId, card: { rarity: 'LEGENDARY' } },
    })
  }

  findForScoring(userIds: string[]) {
    return this.#prisma.userCard.findMany({
      where: { userId: { in: userIds } },
      select: {
        userId: true,
        variant: true,
        quantity: true,
        card: { select: { rarity: true } },
      },
    })
  }

  async recycleInTx(
    tx: PrimaTransactionClient,
    userId: string,
    cardId: string,
    variant: CardVariant,
    quantity: number,
  ): Promise<void> {
    const uc = await tx.userCard.findUnique({
      where: { userId_cardId_variant: { userId, cardId, variant } },
    })
    if (!uc || uc.quantity < quantity) {
      throw Boom.badRequest('You do not own this card')
    }
    if (uc.quantity - quantity <= 0) {
      await tx.userCard.delete({
        where: { userId_cardId_variant: { userId, cardId, variant } },
      })
    } else {
      await tx.userCard.update({
        where: { userId_cardId_variant: { userId, cardId, variant } },
        data: { quantity: { decrement: quantity } },
      })
    }
  }
}

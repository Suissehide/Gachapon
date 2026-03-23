import type { IocContainer } from '../../../types/application/ioc'
import type { UserCardWithCard } from '../../../types/domain/gacha/gacha.types'
import type { PrimaTransactionClient } from '../../../types/infra/orm/client'
import type { IUserCardRepository } from '../../../types/infra/orm/repositories/user-card.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'
import type { CardVariant } from '../../../types/domain/gacha/gacha.types'

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

  async upsert(userId: string, cardId: string, variant: CardVariant): Promise<{ wasDuplicate: boolean }> {
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
  async upsertInTx(tx: PrimaTransactionClient, userId: string, cardId: string, variant: CardVariant): Promise<{ wasDuplicate: boolean }> {
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

  async decrementOrDelete(userId: string, cardId: string, variant: CardVariant): Promise<{ quantityLeft: number }> {
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
}

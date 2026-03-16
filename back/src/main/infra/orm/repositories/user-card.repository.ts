import type { IocContainer } from '../../../types/application/ioc'
import type { UserCardWithCard } from '../../../types/domain/gacha/gacha.types'
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

  /** Must be called inside a SERIALIZABLE transaction — non-atomic read-then-write. */
  async upsert(
    userId: string,
    cardId: string,
  ): Promise<{ wasDuplicate: boolean }> {
    const existing = await this.#prisma.userCard.findUnique({
      where: { userId_cardId: { userId, cardId } },
    })
    if (existing) {
      await this.#prisma.userCard.update({
        where: { userId_cardId: { userId, cardId } },
        data: { quantity: { increment: 1 } },
      })
      return { wasDuplicate: true }
    }
    await this.#prisma.userCard.create({
      data: { userId, cardId, quantity: 1, obtainedAt: new Date() },
    })
    return { wasDuplicate: false }
  }

  /** Must be called inside a SERIALIZABLE transaction — non-atomic read-then-write. */
  async decrementOrDelete(
    userId: string,
    cardId: string,
  ): Promise<{ quantityLeft: number }> {
    const uc = await this.#prisma.userCard.findUniqueOrThrow({
      where: { userId_cardId: { userId, cardId } },
    })
    if (uc.quantity <= 1) {
      await this.#prisma.userCard.delete({
        where: { userId_cardId: { userId, cardId } },
      })
      return { quantityLeft: 0 }
    }
    const updated = await this.#prisma.userCard.update({
      where: { userId_cardId: { userId, cardId } },
      data: { quantity: { decrement: 1 } },
    })
    return { quantityLeft: updated.quantity }
  }
}

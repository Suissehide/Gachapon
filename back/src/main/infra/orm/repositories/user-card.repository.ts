import { hasFinish } from '../../../domain/collection/finishes'
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

  /**
   * Ajoute un exemplaire de la carte, quelle que soit sa variante, et
   * débloque le vernis tiré s'il est nouveau. Must be called inside a
   * SERIALIZABLE transaction.
   */
  async upsertInTx(
    tx: PrimaTransactionClient,
    userId: string,
    cardId: string,
    variant: CardVariant,
  ): Promise<{ wasDuplicate: boolean; newFinish: boolean }> {
    const existing = await tx.userCard.findUnique({
      where: { userId_cardId: { userId, cardId } },
      select: { finishes: true },
    })
    const newFinish = !hasFinish(existing?.finishes ?? [], variant)
    if (existing) {
      await tx.userCard.update({
        where: { userId_cardId: { userId, cardId } },
        data: {
          quantity: { increment: 1 },
          ...(newFinish ? { finishes: { push: variant } } : {}),
        },
      })
      return { wasDuplicate: true, newFinish }
    }
    await tx.userCard.create({
      data: {
        userId,
        cardId,
        finishes: newFinish ? [variant] : [],
        displayedFinish: variant,
        quantity: 1,
        obtainedAt: new Date(),
      },
    })
    return { wasDuplicate: false, newFinish }
  }

  countByUser(userId: string): Promise<number> {
    return this.#prisma.userCard.count({ where: { userId } })
  }

  async countUniqueBySet(userId: string): Promise<Map<string, number>> {
    // Returns the count of UNIQUE cards (by cardId, ignoring variants and quantity)
    // owned by `userId`, grouped by setId. Used by the profile page's sets-progression.
    const rows = await this.#prisma.userCard.findMany({
      where: { userId },
      select: { card: { select: { setId: true, id: true } } },
      distinct: ['cardId'],
    })
    const counts = new Map<string, number>()
    for (const row of rows) {
      const setId = row.card.setId
      counts.set(setId, (counts.get(setId) ?? 0) + 1)
    }
    return counts
  }

  countLegendaryByUser(userId: string): Promise<number> {
    return this.#prisma.userCard.count({
      where: { userId, card: { rarity: 'LEGENDARY' } },
    })
  }

  /**
   * Une entrée par vernis possédé (NORMAL implicite compris) : le score de
   * collection compte chaque vernis d'une carte, comme quand chaque variante
   * était une ligne.
   */
  async findForScoring(userIds: string[]) {
    const rows = await this.#prisma.userCard.findMany({
      where: { userId: { in: userIds } },
      select: {
        userId: true,
        finishes: true,
        quantity: true,
        card: { select: { rarity: true } },
      },
    })
    return rows.flatMap(({ finishes, ...uc }) =>
      (['NORMAL', ...finishes] as CardVariant[]).map((variant) => ({
        ...uc,
        variant,
      })),
    )
  }
}

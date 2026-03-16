import type { IocContainer } from '../../../types/application/ioc'
import type { CardWithSet, CardSetEntity } from '../../../types/domain/gacha/gacha.types'
import type { ICardRepository } from '../../../types/infra/orm/repositories/card.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

const WITH_SET = { set: true } as const

export class CardRepository implements ICardRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  findById(id: string): Promise<CardWithSet | null> {
    return this.#prisma.card.findUnique({ where: { id }, include: WITH_SET }) as Promise<CardWithSet | null>
  }

  findAllActive(): Promise<CardWithSet[]> {
    return this.#prisma.card.findMany({
      where: { set: { isActive: true } },
      include: WITH_SET,
    }) as Promise<CardWithSet[]>
  }

  findAll(filter?: { setId?: string; rarity?: string }): Promise<CardWithSet[]> {
    return this.#prisma.card.findMany({
      where: {
        ...(filter?.setId ? { setId: filter.setId } : {}),
        ...(filter?.rarity ? { rarity: filter.rarity as any } : {}),
      },
      include: WITH_SET,
      orderBy: [{ rarity: 'desc' }, { name: 'asc' }],
    }) as Promise<CardWithSet[]>
  }

  findActiveSets(): Promise<CardSetEntity[]> {
    return this.#prisma.cardSet.findMany({ where: { isActive: true } })
  }

  findAllSets(): Promise<CardSetEntity[]> {
    return this.#prisma.cardSet.findMany({ orderBy: { name: 'asc' } })
  }

  findSetById(id: string): Promise<CardSetEntity | null> {
    return this.#prisma.cardSet.findUnique({ where: { id } })
  }
}

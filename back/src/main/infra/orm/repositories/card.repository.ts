import type { IocContainer } from '../../../types/application/ioc'
import type {
  CardRarity,
  CardSetEntity,
  CardWithSet,
} from '../../../types/domain/gacha/gacha.types'
import type { PrimaTransactionClient } from '../../../types/infra/orm/client'
import type { ICardRepository } from '../../../types/infra/orm/repositories/card.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

const WITH_SET = { set: true } as const

export class CardRepository implements ICardRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  findById(id: string): Promise<CardWithSet | null> {
    return this.#prisma.card.findUnique({
      where: { id },
      include: WITH_SET,
    }) as Promise<CardWithSet | null>
  }

  findAllActive(): Promise<CardWithSet[]> {
    return this.#prisma.card.findMany({
      where: { set: { isActive: true } },
      include: WITH_SET,
    }) as Promise<CardWithSet[]>
  }

  findAll(filter?: {
    setId?: string
    rarity?: CardRarity
  }): Promise<CardWithSet[]> {
    return this.#prisma.card.findMany({
      where: {
        ...(filter?.setId ? { setId: filter.setId } : {}),
        ...(filter?.rarity ? { rarity: filter.rarity } : {}),
      },
      include: WITH_SET,
      orderBy: [{ rarity: 'desc' }, { name: 'asc' }],
    }) as Promise<CardWithSet[]>
  }

  findActiveSets(): Promise<CardSetEntity[]> {
    return this.#prisma.cardSet.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
  }

  findAllSets(): Promise<CardSetEntity[]> {
    return this.#prisma.cardSet.findMany({ orderBy: { name: 'asc' } })
  }

  findSetById(id: string): Promise<CardSetEntity | null> {
    return this.#prisma.cardSet.findUnique({ where: { id } })
  }

  findActiveForPullInTx(
    tx: PrimaTransactionClient,
    forceLegendary: boolean,
  ): Promise<CardWithSet[]> {
    return tx.card.findMany({
      where: {
        set: { isActive: true },
        ...(forceLegendary ? { rarity: 'LEGENDARY' } : {}),
      },
      include: { set: true },
    }) as Promise<CardWithSet[]>
  }

  create(data: {
    name: string
    setId: string
    rarity: CardRarity
    dropWeight: number
    imageUrl: string
  }): Promise<CardWithSet> {
    return this.#prisma.card.create({
      data,
      include: WITH_SET,
    }) as Promise<CardWithSet>
  }

  update(
    id: string,
    data: Partial<{
      name: string
      rarity: CardRarity
      dropWeight: number
      setId: string
      imageUrl: string | null
    }>,
  ): Promise<CardWithSet> {
    return this.#prisma.card.update({
      where: { id },
      data,
      include: WITH_SET,
    }) as Promise<CardWithSet>
  }

  async delete(id: string): Promise<void> {
    await this.#prisma.card.delete({ where: { id } })
  }

  createSet(data: {
    name: string
    description?: string
    isActive?: boolean
  }): Promise<CardSetEntity> {
    return this.#prisma.cardSet.create({ data })
  }

  updateSet(
    id: string,
    data: { name?: string; description?: string; isActive?: boolean },
  ): Promise<CardSetEntity> {
    return this.#prisma.cardSet.update({ where: { id }, data })
  }

  async deleteSet(id: string): Promise<void> {
    await this.#prisma.cardSet.delete({ where: { id } })
  }

  findAllSetsWithCount(): Promise<
    (CardSetEntity & { _count: { cards: number } })[]
  > {
    return this.#prisma.cardSet.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { cards: true } } },
    }) as Promise<(CardSetEntity & { _count: { cards: number } })[]>
  }

  findAllForMedia(): Promise<
    { imageUrl: string | null; id: string; name: string; rarity: CardRarity }[]
  > {
    return this.#prisma.card.findMany({
      select: { imageUrl: true, id: true, name: true, rarity: true },
    }) as Promise<
      {
        imageUrl: string | null
        id: string
        name: string
        rarity: CardRarity
      }[]
    >
  }

  findByImageUrls(
    urls: string[],
  ): Promise<{ name: string; imageUrl: string | null }[]> {
    return this.#prisma.card.findMany({
      where: { imageUrl: { in: urls } },
      select: { name: true, imageUrl: true },
    })
  }

  async updateManyImageUrl(oldUrl: string, newUrl: string): Promise<void> {
    await this.#prisma.card.updateMany({
      where: { imageUrl: oldUrl },
      data: { imageUrl: newUrl },
    })
  }
}

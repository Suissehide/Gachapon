import type { IocContainer } from '../../../types/application/ioc'
import type { GachaPullWithCard } from '../../../types/domain/gacha/gacha.types'
import type { IGachaPullRepository } from '../../../types/infra/orm/repositories/gacha-pull.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class GachaPullRepository implements IGachaPullRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  create(data: {
    userId: string
    cardId: string
    wasDuplicate: boolean
    dustEarned: number
  }) {
    return this.#prisma.gachaPull.create({ data })
  }

  async findByUser(userId: string, pagination: { skip: number; take: number }) {
    const [pulls, total] = await Promise.all([
      this.#prisma.gachaPull.findMany({
        where: { userId },
        include: { card: { include: { set: true } } },
        orderBy: { pulledAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.#prisma.gachaPull.count({ where: { userId } }),
    ])
    return { pulls: pulls as GachaPullWithCard[], total }
  }
}

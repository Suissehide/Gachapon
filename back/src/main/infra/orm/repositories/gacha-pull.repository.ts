import type { IocContainer } from '../../../types/application/ioc'
import type {
  GachaPullEntity,
  GachaPullWithCard,
} from '../../../types/domain/gacha/gacha.types'
import type { PrimaTransactionClient } from '../../../types/infra/orm/client'
import type {
  CreateGachaPullInput,
  IGachaPullRepository,
} from '../../../types/infra/orm/repositories/gacha-pull.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class GachaPullRepository implements IGachaPullRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  create(data: CreateGachaPullInput): Promise<GachaPullEntity> {
    return this.#prisma.gachaPull.create({ data })
  }

  createInTx(
    tx: PrimaTransactionClient,
    data: CreateGachaPullInput,
  ): Promise<GachaPullEntity> {
    return tx.gachaPull.create({ data })
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

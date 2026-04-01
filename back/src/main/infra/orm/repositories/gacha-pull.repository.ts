import type { IocContainer } from '../../../types/application/ioc'
import type {
  GachaPullEntity,
  GachaPullWithCard,
} from '../../../types/domain/gacha/gacha.types'
import type { PrimaTransactionClient } from '../../../types/infra/orm/client'
import type {
  CreateGachaPullInput,
  IGachaPullRepository,
  RecentPullEntry,
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

  countByUser(userId: string): Promise<number> {
    return this.#prisma.gachaPull.count({ where: { userId } })
  }

  async sumDustEarnedByUser(userId: string): Promise<number> {
    const agg = await this.#prisma.gachaPull.aggregate({
      where: { userId },
      _sum: { dustEarned: true },
    })
    return agg._sum.dustEarned ?? 0
  }

  async findRecent(limit: number): Promise<RecentPullEntry[]> {
    const pulls = await this.#prisma.gachaPull.findMany({
      take: limit,
      orderBy: { pulledAt: 'desc' },
      include: {
        card: { include: { set: true } },
        user: { select: { username: true } },
      },
    })
    return pulls.map((p) => ({
      username: p.user.username,
      cardName: p.card.name,
      rarity: p.card.rarity,
      variant: p.variant,
      cardId: p.card.id,
      imageUrl: p.card.imageUrl,
      setName: p.card.set.name,
      pulledAt: p.pulledAt,
    }))
  }
}

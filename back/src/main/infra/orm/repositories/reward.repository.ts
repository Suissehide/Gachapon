import type { Reward } from '../../../../generated/client'
import type { IocContainer } from '../../../types/application/ioc'
import type {
  RewardRepositoryInterface,
  RewardWriteData,
} from '../../../types/infra/orm/repositories/reward.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class RewardRepository implements RewardRepositoryInterface {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  create(data: RewardWriteData): Promise<Reward> {
    return this.#prisma.reward.create({ data })
  }

  update(id: string, data: Partial<RewardWriteData>): Promise<Reward> {
    return this.#prisma.reward.update({ where: { id }, data })
  }
}

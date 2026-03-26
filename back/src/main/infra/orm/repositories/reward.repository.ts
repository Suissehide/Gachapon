import type { Reward } from '../../../../generated/client'
import type { IocContainer } from '../../../types/application/ioc'
import type { RewardRepositoryInterface } from '../../../types/infra/orm/repositories/reward.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class RewardRepository implements RewardRepositoryInterface {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  create(data: { tokens: number; dust: number; xp: number }): Promise<Reward> {
    return this.#prisma.reward.create({ data })
  }
}

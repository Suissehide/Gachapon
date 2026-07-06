import type { UserBoost } from '../../../../generated/client'
import type { IocContainer } from '../../../types/application/ioc'
import type { PrimaTransactionClient } from '../../../types/infra/orm/client'
import type {
  CreateUserBoostData,
  IUserBoostRepository,
} from '../../../types/infra/orm/repositories/user-boost.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class UserBoostRepository implements IUserBoostRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  findActiveByUser(userId: string): Promise<UserBoost[]> {
    return this.#prisma.userBoost.findMany({
      where: { userId, pullsRemaining: { gt: 0 } },
    })
  }

  findActiveByUserInTx(
    tx: PrimaTransactionClient,
    userId: string,
  ): Promise<UserBoost[]> {
    return tx.userBoost.findMany({
      where: { userId, pullsRemaining: { gt: 0 } },
    })
  }

  createInTx(
    tx: PrimaTransactionClient,
    data: CreateUserBoostData,
  ): Promise<UserBoost> {
    return tx.userBoost.create({ data })
  }

  decrementInTx(
    tx: PrimaTransactionClient,
    id: string,
    opts?: { satisfied?: boolean; by?: number },
  ): Promise<UserBoost> {
    return tx.userBoost.update({
      where: { id },
      data: {
        pullsRemaining: { decrement: opts?.by ?? 1 },
        ...(opts?.satisfied !== undefined ? { satisfied: opts.satisfied } : {}),
      },
    })
  }
}

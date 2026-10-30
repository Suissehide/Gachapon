import Boom from '@hapi/boom'

import type { CapsuleType, UserCapsule } from '../../../../generated/client'
import type { IocContainer } from '../../../types/application/ioc'
import type { PrimaTransactionClient } from '../../../types/infra/orm/client'
import type { IUserCapsuleRepository } from '../../../types/infra/orm/repositories/user-capsule.repository.interface'
import { errorMessage } from '../../i18n/error-messages'
import type { PostgresPrismaClient } from '../postgres-client'

export class UserCapsuleRepository implements IUserCapsuleRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  findByUser(userId: string): Promise<UserCapsule[]> {
    return this.#prisma.userCapsule.findMany({ where: { userId } })
  }

  findInTx(
    tx: PrimaTransactionClient,
    userId: string,
    type: CapsuleType,
  ): Promise<UserCapsule | null> {
    return tx.userCapsule.findUnique({
      where: { userId_type: { userId, type } },
    })
  }

  async creditInTx(
    tx: PrimaTransactionClient,
    userId: string,
    type: CapsuleType,
    quantity: number,
  ): Promise<void> {
    await tx.userCapsule.upsert({
      where: { userId_type: { userId, type } },
      create: { userId, type, quantity },
      update: { quantity: { increment: quantity } },
    })
  }

  async consumeInTx(
    tx: PrimaTransactionClient,
    userId: string,
    type: CapsuleType,
    quantity: number,
    pityCurrent: number,
  ): Promise<void> {
    const { count } = await tx.userCapsule.updateMany({
      where: { userId, type, quantity: { gte: quantity } },
      data: { quantity: { decrement: quantity }, pityCurrent },
    })
    if (count === 0) {
      throw Boom.paymentRequired(errorMessage('gacha.notEnoughCapsules'))
    }
  }
}

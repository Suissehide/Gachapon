import type { UserQuest } from '../../../../generated/client'
import type { IocContainer } from '../../../types/application/ioc'
import type { PrimaTransactionClient } from '../../../types/infra/orm/client'
import type { IUserQuestRepository } from '../../../types/infra/orm/repositories/user-quest.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class UserQuestRepository implements IUserQuestRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: Pick<IocContainer, 'postgresOrm'>) {
    this.#prisma = postgresOrm.prisma
  }

  findByUserAndPeriodKeys(
    userId: string,
    periodKeys: string[],
  ): Promise<UserQuest[]> {
    return this.#prisma.userQuest.findMany({
      where: { userId, periodKey: { in: periodKeys } },
    })
  }

  async createManySkipDuplicates(
    data: Array<{ userId: string; questId: string; periodKey: string }>,
  ): Promise<void> {
    if (data.length === 0) {
      return
    }
    await this.#prisma.userQuest.createMany({ data, skipDuplicates: true })
  }

  upsertInTx(
    tx: PrimaTransactionClient,
    data: {
      userId: string
      questId: string
      periodKey: string
      progress: number
      completed: boolean
      completedAt: Date | null
    },
  ): Promise<UserQuest> {
    const { userId, questId, periodKey, progress, completed, completedAt } =
      data
    return tx.userQuest.upsert({
      where: { userId_questId_periodKey: { userId, questId, periodKey } },
      create: { userId, questId, periodKey, progress, completed, completedAt },
      update: { progress, completed, completedAt },
    })
  }

  findUniqueInTx(
    tx: PrimaTransactionClient,
    key: { userId: string; questId: string; periodKey: string },
  ): Promise<UserQuest | null> {
    return tx.userQuest.findUnique({
      where: { userId_questId_periodKey: key },
    })
  }
}

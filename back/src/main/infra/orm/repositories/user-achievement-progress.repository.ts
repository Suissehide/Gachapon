import type { UserAchievementProgress } from '../../../../generated/client'
import type { IocContainer } from '../../../types/application/ioc'
import type { PrimaTransactionClient } from '../../../types/infra/orm/client'
import type { UserAchievementProgressRepositoryInterface } from '../../../types/infra/orm/repositories/user-achievement-progress.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class UserAchievementProgressRepository
  implements UserAchievementProgressRepositoryInterface
{
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  incrementInTx(
    tx: PrimaTransactionClient,
    userId: string,
    achievementId: string,
    delta: number,
  ): Promise<UserAchievementProgress> {
    return tx.userAchievementProgress.upsert({
      where: { userId_achievementId: { userId, achievementId } },
      create: { userId, achievementId, progress: delta },
      update: { progress: { increment: delta } },
    })
  }

  upsertInTx(
    tx: PrimaTransactionClient,
    userId: string,
    achievementId: string,
    progress: number,
  ): Promise<UserAchievementProgress> {
    return tx.userAchievementProgress.upsert({
      where: { userId_achievementId: { userId, achievementId } },
      create: { userId, achievementId, progress },
      update: { progress },
    })
  }

  findByUserId(userId: string): Promise<UserAchievementProgress[]> {
    return this.#prisma.userAchievementProgress.findMany({ where: { userId } })
  }
}

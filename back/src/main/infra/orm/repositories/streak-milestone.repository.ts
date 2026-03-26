import type { IocContainer } from '../../../types/application/ioc'
import type {
  StreakMilestoneRepositoryInterface,
  StreakMilestoneWithReward,
} from '../../../types/infra/orm/repositories/streak-milestone.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class StreakMilestoneRepository implements StreakMilestoneRepositoryInterface {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  findBestForDay(targetDay: number): Promise<StreakMilestoneWithReward | null> {
    return this.#prisma.streakMilestone.findFirst({
      where: { isActive: true, day: { lte: targetDay } },
      orderBy: { day: 'desc' },
      include: { reward: true },
    })
  }
}

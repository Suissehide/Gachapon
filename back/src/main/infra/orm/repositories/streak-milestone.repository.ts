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

  findExactMilestoneForDay(targetDay: number): Promise<StreakMilestoneWithReward | null> {
    return this.#prisma.streakMilestone.findFirst({
      where: { day: targetDay, isMilestone: true, isActive: true },
      include: { reward: true },
    })
  }

  findDefault(): Promise<StreakMilestoneWithReward | null> {
    return this.#prisma.streakMilestone.findFirst({
      where: { day: 0 },
      include: { reward: true },
    })
  }

  findAllActive(): Promise<StreakMilestoneWithReward[]> {
    return this.#prisma.streakMilestone.findMany({
      where: { isActive: true, day: { gt: 0 } },
      include: { reward: true },
      orderBy: { day: 'asc' },
    })
  }
}

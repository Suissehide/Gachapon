import type { IocContainer } from '../../../types/application/ioc'
import type { StreakMilestone } from '../../../../generated/client'
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
      where: { day: 0, isActive: true },
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

  findByDay(day: number): Promise<StreakMilestone | null> {
    return this.#prisma.streakMilestone.findFirst({ where: { day } })
  }

  findByIdWithReward(id: string): Promise<StreakMilestoneWithReward | null> {
    return this.#prisma.streakMilestone.findUnique({
      where: { id },
      include: { reward: true },
    })
  }

  create(data: { day: number; isMilestone: boolean; isActive: boolean; rewardId: string }): Promise<StreakMilestoneWithReward> {
    return this.#prisma.streakMilestone.create({
      data,
      include: { reward: true },
    })
  }

  async update(id: string, data: Partial<{ isActive: boolean }>): Promise<void> {
    await this.#prisma.streakMilestone.update({ where: { id }, data })
  }
}

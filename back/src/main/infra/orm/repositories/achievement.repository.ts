import type { IocContainer } from '../../../types/application/ioc'
import type { Achievement } from '../../../../generated/client'
import type { IAchievementRepository, CreateAchievementInput, UpdateAchievementInput } from '../../../types/infra/orm/repositories/achievement.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class AchievementRepository implements IAchievementRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  findAll(): Promise<Achievement[]> {
    return this.#prisma.achievement.findMany({ orderBy: { name: 'asc' } })
  }

  findById(id: string): Promise<Achievement | null> {
    return this.#prisma.achievement.findUnique({ where: { id } })
  }

  create(data: CreateAchievementInput): Promise<Achievement> {
    return this.#prisma.achievement.create({ data })
  }

  update(id: string, data: UpdateAchievementInput): Promise<Achievement> {
    return this.#prisma.achievement.update({ where: { id }, data })
  }

  async delete(id: string): Promise<void> {
    await this.#prisma.achievement.delete({ where: { id } })
  }
}

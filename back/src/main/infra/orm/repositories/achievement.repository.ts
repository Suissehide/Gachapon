import type { IocContainer } from '../../../types/application/ioc'
import type { LocalizedAchievement } from '../../../types/infra/orm/localized'
import type {
  CreateAchievementInput,
  IAchievementRepository,
  UpdateAchievementInput,
} from '../../../types/infra/orm/repositories/achievement.repository.interface'
import { localizedNameOrder } from '../../i18n/locale-order'
import type { PostgresPrismaClient } from '../postgres-client'

export class AchievementRepository implements IAchievementRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  findAll(): Promise<LocalizedAchievement[]> {
    return this.#prisma.achievement.findMany({
      orderBy: localizedNameOrder(),
    })
  }

  findById(id: string): Promise<LocalizedAchievement | null> {
    return this.#prisma.achievement.findUnique({ where: { id } })
  }

  create(data: CreateAchievementInput): Promise<LocalizedAchievement> {
    return this.#prisma.achievement.create({ data })
  }

  update(
    id: string,
    data: UpdateAchievementInput,
  ): Promise<LocalizedAchievement> {
    return this.#prisma.achievement.update({ where: { id }, data })
  }

  async delete(id: string): Promise<void> {
    await this.#prisma.achievement.delete({ where: { id } })
  }
}

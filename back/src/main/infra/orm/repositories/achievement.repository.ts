import type { IocContainer } from '../../../types/application/ioc'
import type { LocalizedAchievement } from '../../../types/infra/orm/localized'
import type {
  CreateAchievementInput,
  IAchievementRepository,
  UpdateAchievementInput,
} from '../../../types/infra/orm/repositories/achievement.repository.interface'
import { localizedNameOrder } from '../../i18n/locale-order'
import {
  descriptionToBothLocales,
  nameToBothLocales,
} from '../../i18n/monolingual-write'
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
    const { name, description, ...rest } = data
    return this.#prisma.achievement.create({
      data: {
        ...rest,
        ...nameToBothLocales(name),
        ...descriptionToBothLocales(description),
      },
    })
  }

  update(
    id: string,
    data: UpdateAchievementInput,
  ): Promise<LocalizedAchievement> {
    const { name, description, ...rest } = data
    return this.#prisma.achievement.update({
      where: { id },
      data: {
        ...rest,
        ...nameToBothLocales(name),
        ...descriptionToBothLocales(description),
      },
    })
  }

  async delete(id: string): Promise<void> {
    await this.#prisma.achievement.delete({ where: { id } })
  }
}

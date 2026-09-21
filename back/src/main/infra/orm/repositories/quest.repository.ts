import type { IocContainer } from '../../../types/application/ioc'
import type { LocalizedQuest } from '../../../types/infra/orm/localized'
import type {
  CreateQuestInput,
  IQuestRepository,
  UpdateQuestInput,
} from '../../../types/infra/orm/repositories/quest.repository.interface'
import { localizedNameOrder } from '../../i18n/locale-order'
import type { PostgresPrismaClient } from '../postgres-client'

export class QuestRepository implements IQuestRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  findAll(): Promise<LocalizedQuest[]> {
    return this.#prisma.quest.findMany({ orderBy: localizedNameOrder() })
  }

  findById(id: string): Promise<LocalizedQuest | null> {
    return this.#prisma.quest.findUnique({ where: { id } })
  }

  create(data: CreateQuestInput): Promise<LocalizedQuest> {
    // biome-ignore lint/suspicious/noExplicitAny: Prisma JSON field requires cast
    return this.#prisma.quest.create({ data: data as any })
  }

  update(id: string, data: UpdateQuestInput): Promise<LocalizedQuest> {
    // biome-ignore lint/suspicious/noExplicitAny: Prisma JSON field requires cast
    return this.#prisma.quest.update({ where: { id }, data: data as any })
  }

  async delete(id: string): Promise<void> {
    await this.#prisma.quest.delete({ where: { id } })
  }
}

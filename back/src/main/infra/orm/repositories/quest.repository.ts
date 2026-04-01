import type { IocContainer } from '../../../types/application/ioc'
import type { Quest } from '../../../../generated/client'
import type { IQuestRepository, CreateQuestInput, UpdateQuestInput } from '../../../types/infra/orm/repositories/quest.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class QuestRepository implements IQuestRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  findAll(): Promise<Quest[]> {
    return this.#prisma.quest.findMany({ orderBy: { name: 'asc' } })
  }

  findById(id: string): Promise<Quest | null> {
    return this.#prisma.quest.findUnique({ where: { id } })
  }

  create(data: CreateQuestInput): Promise<Quest> {
    // biome-ignore lint/suspicious/noExplicitAny: Prisma JSON field requires cast
    return this.#prisma.quest.create({ data: data as any })
  }

  update(id: string, data: UpdateQuestInput): Promise<Quest> {
    // biome-ignore lint/suspicious/noExplicitAny: Prisma JSON field requires cast
    return this.#prisma.quest.update({ where: { id }, data: data as any })
  }

  async delete(id: string): Promise<void> {
    await this.#prisma.quest.delete({ where: { id } })
  }
}

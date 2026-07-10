import type { ActivityEventType } from '../../../../generated/enums'
import type { IocContainer } from '../../../types/application/ioc'
import type {
  ActivityEventWithUser,
  IActivityEventRepository,
} from '../../../types/infra/orm/repositories/activity-event.repository.interface'
import type { PostgresPrismaClient } from '../postgres-client'

export class ActivityEventRepository implements IActivityEventRepository {
  readonly #prisma: PostgresPrismaClient

  constructor({ postgresOrm }: IocContainer) {
    this.#prisma = postgresOrm.prisma
  }

  async create(input: {
    type: ActivityEventType
    userId?: string | null
    payload?: Record<string, unknown>
  }): Promise<void> {
    await this.#prisma.activityEvent.create({
      data: {
        type: input.type,
        userId: input.userId ?? null,
        // Prisma expects InputJsonValue; cast through unknown to satisfy strict typing
        payload: (input.payload ?? undefined) as never,
      },
    })
  }

  async list(params: {
    cursor?: string
    limit: number
    type?: ActivityEventType
  }): Promise<{ events: ActivityEventWithUser[]; nextCursor: string | null }> {
    const rows = await this.#prisma.activityEvent.findMany({
      where: params.type ? { type: params.type } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: { user: { select: { id: true, username: true } } },
    })
    const hasMore = rows.length > params.limit
    const events = hasMore ? rows.slice(0, params.limit) : rows
    return {
      events: events.map((e) => ({
        id: e.id,
        type: e.type,
        payload: e.payload,
        createdAt: e.createdAt,
        user: e.user,
      })),
      nextCursor: hasMore ? (events[events.length - 1]?.id ?? null) : null,
    }
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const result = await this.#prisma.activityEvent.deleteMany({
      where: { createdAt: { lt: date } },
    })
    return result.count
  }
}

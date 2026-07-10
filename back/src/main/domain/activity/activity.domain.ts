import type { ActivityEventType } from '../../../generated/enums'
import type {
  AdminActivityEvent,
  WsManager,
} from '../../interfaces/ws/ws-manager'
import type { IocContainer } from '../../types/application/ioc'
import type { IActivityDomain } from '../../types/domain/activity/activity.domain.interface'
import type { IActivityEventRepository } from '../../types/infra/orm/repositories/activity-event.repository.interface'
import type { Logger } from '../../types/utils/logger'

export class ActivityDomain implements IActivityDomain {
  readonly #repository: IActivityEventRepository
  readonly #wsManager: WsManager
  readonly #logger: Logger

  constructor({
    activityEventRepository,
    wsManager,
    logger,
  }: Pick<IocContainer, 'activityEventRepository' | 'wsManager' | 'logger'>) {
    this.#repository = activityEventRepository
    this.#wsManager = wsManager
    this.#logger = logger
  }

  /** Best-effort : l'enregistrement d'un événement ne doit jamais faire
   *  échouer le flux métier appelant. */
  async record(
    type: ActivityEventType,
    opts: {
      userId?: string
      username?: string
      payload?: Record<string, unknown>
    } = {},
  ): Promise<void> {
    try {
      const row = await this.#repository.create({
        type,
        userId: opts.userId ?? null,
        payload: opts.payload,
      })
      const adminEvent: AdminActivityEvent = {
        type: 'admin:activity',
        event: {
          id: row.id,
          type,
          payload: opts.payload ?? null,
          createdAt: row.createdAt.toISOString(),
          user:
            opts.userId && opts.username
              ? { id: opts.userId, username: opts.username }
              : null,
        },
      }
      this.#wsManager.notifyAdmins(adminEvent)
    } catch (error) {
      this.#logger.warn(
        `activity record failed: type=${type} error=${String(error)}`,
      )
    }
  }

  list(params: { cursor?: string; limit: number; type?: ActivityEventType }) {
    return this.#repository.list(params)
  }

  purgeOlderThanDays(days: number): Promise<number> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    return this.#repository.deleteOlderThan(cutoff)
  }
}

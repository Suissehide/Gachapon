import type { ActivityEventType } from '../../../../generated/enums'
import type { ActivityEventWithUser } from '../../infra/orm/repositories/activity-event.repository.interface'

export interface IActivityDomain {
  record(
    type: ActivityEventType,
    opts?: {
      userId?: string
      username?: string
      payload?: Record<string, unknown>
    },
  ): Promise<void>
  list(params: {
    cursor?: string
    limit: number
    type?: ActivityEventType
  }): Promise<{ events: ActivityEventWithUser[]; nextCursor: string | null }>
  purgeOlderThanDays(days: number): Promise<number>
}

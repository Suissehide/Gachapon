import type { ActivityEventType } from '../../../../../generated/enums'

export type ActivityEventWithUser = {
  id: string
  type: ActivityEventType
  payload: unknown
  createdAt: Date
  user: { id: string; username: string } | null
}

export interface IActivityEventRepository {
  create(input: {
    type: ActivityEventType
    userId?: string | null
    payload?: Record<string, unknown>
  }): Promise<void>
  list(params: {
    cursor?: string
    limit: number
    type?: ActivityEventType
  }): Promise<{ events: ActivityEventWithUser[]; nextCursor: string | null }>
  deleteOlderThan(date: Date): Promise<number>
}

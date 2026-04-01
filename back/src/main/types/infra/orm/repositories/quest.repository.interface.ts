import type { Quest } from '../../../../../generated/client'

export type CreateQuestInput = {
  key: string
  name: string
  description: string
  criterion: Record<string, unknown>
  isActive?: boolean
}

export type UpdateQuestInput = Partial<CreateQuestInput>

export interface IQuestRepository {
  findAll(): Promise<Quest[]>
  findById(id: string): Promise<Quest | null>
  create(data: CreateQuestInput): Promise<Quest>
  update(id: string, data: UpdateQuestInput): Promise<Quest>
  delete(id: string): Promise<void>
}

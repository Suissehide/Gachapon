import type { Quest } from '../../../../../generated/client'
import type { LocalizedQuest } from '../localized'

export type CreateQuestInput = {
  key: string
  nameFr: string
  nameEn: string
  descriptionFr: string
  descriptionEn: string
  criterion: Record<string, unknown>
  isActive?: boolean
}

export type UpdateQuestInput = Partial<CreateQuestInput>

export interface IQuestRepository {
  findAll(): Promise<LocalizedQuest[]>
  findById(id: string): Promise<Quest | null>
  create(data: CreateQuestInput): Promise<Quest>
  update(id: string, data: UpdateQuestInput): Promise<Quest>
  delete(id: string): Promise<void>
}

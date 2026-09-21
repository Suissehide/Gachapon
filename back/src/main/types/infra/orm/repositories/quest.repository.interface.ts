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
  findById(id: string): Promise<LocalizedQuest | null>
  create(data: CreateQuestInput): Promise<LocalizedQuest>
  update(id: string, data: UpdateQuestInput): Promise<LocalizedQuest>
  delete(id: string): Promise<void>
}

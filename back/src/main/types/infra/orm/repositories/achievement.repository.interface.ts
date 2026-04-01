import type { Achievement } from '../../../../../generated/client'

export type CreateAchievementInput = {
  key: string
  name: string
  description: string
}

export type UpdateAchievementInput = Partial<CreateAchievementInput>

export interface IAchievementRepository {
  findAll(): Promise<Achievement[]>
  findById(id: string): Promise<Achievement | null>
  create(data: CreateAchievementInput): Promise<Achievement>
  update(id: string, data: UpdateAchievementInput): Promise<Achievement>
  delete(id: string): Promise<void>
}

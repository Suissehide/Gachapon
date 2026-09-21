import type { LocalizedAchievement } from '../localized'

export type CreateAchievementInput = {
  key: string
  name: string
  description: string
  criterion: Record<string, unknown>
  family?: string | null
  tier?: number
  hidden?: boolean
  iconKey?: string | null
  sortOrder?: number
  isActive?: boolean
  rewardId?: string | null
}

export type UpdateAchievementInput = Partial<CreateAchievementInput>

export interface IAchievementRepository {
  findAll(): Promise<LocalizedAchievement[]>
  findById(id: string): Promise<LocalizedAchievement | null>
  create(data: CreateAchievementInput): Promise<LocalizedAchievement>
  update(
    id: string,
    data: UpdateAchievementInput,
  ): Promise<LocalizedAchievement>
  delete(id: string): Promise<void>
}

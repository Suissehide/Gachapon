import type { Achievement } from '../../../../../generated/client'

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
  findAll(): Promise<Achievement[]>
  findById(id: string): Promise<Achievement | null>
  create(data: CreateAchievementInput): Promise<Achievement>
  update(id: string, data: UpdateAchievementInput): Promise<Achievement>
  delete(id: string): Promise<void>
}

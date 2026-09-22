import type { CardRarity } from '../../../../../generated/client'
import type { LocalizedReward } from '../localized'

export type RewardWriteData = {
  tokens: number
  dust: number
  xp: number
  cardRarity: CardRarity | null
}

export interface RewardRepositoryInterface {
  create(data: RewardWriteData): Promise<LocalizedReward>
  update(id: string, data: Partial<RewardWriteData>): Promise<LocalizedReward>
}

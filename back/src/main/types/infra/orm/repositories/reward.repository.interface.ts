import type { CardRarity, Reward } from '../../../../../generated/client'

export type RewardWriteData = {
  tokens: number
  dust: number
  xp: number
  cardRarity: CardRarity | null
}

export interface RewardRepositoryInterface {
  create(data: RewardWriteData): Promise<Reward>
  update(id: string, data: Partial<RewardWriteData>): Promise<Reward>
}

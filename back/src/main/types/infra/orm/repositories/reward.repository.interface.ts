import type { Reward } from '../../../../../generated/client'

export interface RewardRepositoryInterface {
  create(data: { tokens: number; dust: number; xp: number }): Promise<Reward>
}

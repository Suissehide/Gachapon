import type { Reward } from '../../../../../generated/client'

export interface RewardRepositoryInterface {
  create(data: { tokens: number; dust: number; xp: number }): Promise<Reward>
  update(
    id: string,
    data: Partial<{ tokens: number; dust: number; xp: number }>,
  ): Promise<Reward>
}

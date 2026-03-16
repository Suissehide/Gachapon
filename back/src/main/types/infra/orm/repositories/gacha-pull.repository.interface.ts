import type { GachaPullWithCard } from '../../../domain/gacha/gacha.types'

export interface IGachaPullRepository {
  create(data: {
    userId: string
    cardId: string
    wasDuplicate: boolean
    dustEarned: number
  }): Promise<{ id: string; pulledAt: Date; wasDuplicate: boolean; dustEarned: number }>

  findByUser(
    userId: string,
    pagination: { skip: number; take: number },
  ): Promise<{ pulls: GachaPullWithCard[]; total: number }>
}

export type RecycleInput = {
  cardId: string
  quantity: number
  variant: 'NORMAL' | 'BRILLIANT' | 'HOLOGRAPHIC'
}

export type RecycleResult = {
  dustEarned: number
  newDustTotal: number
}

export interface ICollectionDomain {
  recycleCard(userId: string, input: RecycleInput): Promise<RecycleResult>
}

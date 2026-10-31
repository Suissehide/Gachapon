import type { PullBatchResult, PullResult } from './gacha.types'

export type AstralPullResult = PullBatchResult & {
  capsulesRemaining: number
  astralPityCurrent: number
}

export interface GachaDomainInterface {
  pull(userId: string): Promise<PullResult>
  pullBatch(userId: string, count: number): Promise<PullBatchResult>
  pullAstral(userId: string, count: number): Promise<AstralPullResult>
}

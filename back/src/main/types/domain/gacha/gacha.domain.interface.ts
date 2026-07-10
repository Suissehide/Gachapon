import type { PullBatchResult, PullResult } from './gacha.types'

export interface GachaDomainInterface {
  pull(userId: string): Promise<PullResult>
  pullBatch(userId: string, count: number): Promise<PullBatchResult>
}

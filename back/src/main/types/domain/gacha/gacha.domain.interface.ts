import type { PullBatchResult, PullResult } from './gacha.types'

export interface GachaDomainInterface {
  pull(userId: string): Promise<PullResult>
  pullBatch(userId: string, count: 1 | 10): Promise<PullBatchResult>
}

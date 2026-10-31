import type { CapsuleType } from '../../../../generated/client'
import type { PullBatchResult, PullResult } from './gacha.types'

export type CapsulePullResult = PullBatchResult & {
  capsulesRemaining: number
  capsulePityCurrent: number
}

export interface GachaDomainInterface {
  pull(userId: string): Promise<PullResult>
  pullBatch(userId: string, count: number): Promise<PullBatchResult>
  pullCapsule(
    userId: string,
    type: CapsuleType,
    count: number,
  ): Promise<CapsulePullResult>
}

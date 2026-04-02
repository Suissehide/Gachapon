import type { ScoringConfig } from '../../../../../generated/client'

export interface IScoringConfigRepository {
  get(): Promise<ScoringConfig>
  upsert(
    data: Partial<Omit<ScoringConfig, 'id' | 'updatedAt'>>,
  ): Promise<ScoringConfig>
}

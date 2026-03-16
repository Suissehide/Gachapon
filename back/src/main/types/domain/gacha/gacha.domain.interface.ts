import type { PullResult } from './gacha.types'

export interface GachaDomainInterface {
  pull(userId: string): Promise<PullResult>
}

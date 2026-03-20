import type { UserUpgradeEffects } from '../../../domain/economy/economy.types'

export interface IUpgradeRepository {
  getEffectsForUser(userId: string): Promise<UserUpgradeEffects>
}

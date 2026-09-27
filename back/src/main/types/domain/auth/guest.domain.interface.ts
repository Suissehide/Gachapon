import type { UnlockedAchievement } from '../../../domain/achievements/events.types'
import type { UserEntity } from '../user/user.types'
import type { TokenPair } from './auth.types'

export type GuestSession = {
  user: UserEntity
  tokens: TokenPair
  unlockedAchievements: UnlockedAchievement[]
}

export interface GuestDomainInterface {
  createGuest(): Promise<GuestSession>
  requestEmailUpgrade(
    userId: string,
    input: { email: string; password: string },
  ): Promise<{ pendingEmail: string }>
}

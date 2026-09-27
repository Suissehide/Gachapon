import type { UserEntity } from '../user/user.types'
import type { TokenPair } from './auth.types'

export type OAuthProviderName = 'google' | 'discord'

export type OAuthMode = 'login' | 'register' | 'link'

export type OAuthUserInfo = { id: string; email: string; username: string }

export interface OAuthDomainInterface {
  getAuthorizationUrl(
    provider: OAuthProviderName,
    state: string,
    mode: OAuthMode,
  ): string
  handleCallback(
    provider: OAuthProviderName,
    code: string,
    linkUserId?: string,
  ): Promise<{
    user: UserEntity
    tokens: TokenPair
    isNew: boolean
    linked: boolean
  }>
  linkGuest(
    guestId: string,
    provider: OAuthProviderName,
    info: { id: string; email: string },
  ): Promise<UserEntity>
}

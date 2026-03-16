import type { UserEntity } from '../user/user.types'
import type { TokenPair } from './auth.types'

export type OAuthProviderName = 'google' | 'discord'

export interface OAuthDomainInterface {
  getAuthorizationUrl(provider: OAuthProviderName, state: string): string
  handleCallback(
    provider: OAuthProviderName,
    code: string,
  ): Promise<{ user: UserEntity; tokens: TokenPair; isNew: boolean }>
}

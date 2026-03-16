import type { UserEntity } from '../user/user.types.js'
import type { TokenPair } from './auth.types.js'

export type OAuthProviderName = 'google' | 'discord'

export interface OAuthDomainInterface {
  getAuthorizationUrl(provider: OAuthProviderName, state: string): string
  handleCallback(provider: OAuthProviderName, code: string): Promise<{ user: UserEntity; tokens: TokenPair; isNew: boolean }>
}

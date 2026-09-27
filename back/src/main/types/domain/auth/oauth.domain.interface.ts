import type { UserEntity } from '../user/user.types'
import type { TokenPair } from './auth.types'

export type OAuthProviderName = 'google' | 'discord'

export type OAuthMode = 'login' | 'register' | 'link'

/**
 * `email` est `null` quand le fournisseur ne le renvoie pas (Discord sans
 * adresse confirmée à son compte). `emailVerified` distingue une adresse
 * confirmée CÔTÉ FOURNISSEUR (Discord `verified`, Google `verified_email`)
 * d'une adresse simplement déclarée : la liaison à un invité (mode `link`)
 * refuse tout email non vérifié ou absent, pour ne jamais poser un email
 * dans `email` sans preuve de possession.
 */
export type OAuthUserInfo = {
  id: string
  email: string | null
  username: string
  emailVerified: boolean
}

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
    info: { id: string; email: string; emailVerified?: boolean },
  ): Promise<UserEntity>
}
